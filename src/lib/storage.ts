import { supabase } from './supabase'
import { PHOTO_BUCKET } from './db'
import { DOC_BUCKET } from './documents'

// Herramientas para ver y reducir el espacio ocupado en Supabase.
// El plan gratuito da 1 GB; cuando se pasa, Supabase avisa y acaba
// restringiendo el servicio. Las dos fuentes de peso son las FOTOS de
// progreso (varios MB cada una si se subieron antes de la compresión) y
// los DOCUMENTOS (PDF de planificaciones).

export interface StoredObject {
  bucket: string
  path: string
  size: number
}

/** Umbral a partir del cual una foto se considera "pesada" y se puede optimizar. */
export const HEAVY_PHOTO_BYTES = 400 * 1024

/** Umbral para los documentos (por debajo no merece la pena tocarlos). */
export const HEAVY_DOC_BYTES = 500 * 1024

/** Imágenes subidas como documento: se reescalan igual que las fotos. */
const DOC_IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp']

/** Formatos de documento que la app sabe comprimir. Word, Excel y zip no. */
export const COMPRESSIBLE_DOC_EXTS = ['pdf', ...DOC_IMG_EXTS]

function pathExt(path: string): string {
  return (path.split('.').pop() || '').toLowerCase()
}

export function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Recorre un bucket entero (carpeta por carpeta) y devuelve todos los archivos. */
async function listPrefix(bucket: string, prefix: string, depth = 0): Promise<StoredObject[]> {
  const out: StoredObject[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw error
    const rows = data ?? []
    for (const r of rows) {
      const meta = r.metadata as { size?: number } | null
      const full = prefix ? `${prefix}/${r.name}` : r.name
      if (!meta) {
        // Es una carpeta: entramos dentro (tope de 3 niveles, de sobra).
        if (depth < 3) out.push(...(await listPrefix(bucket, full, depth + 1)))
      } else {
        out.push({ bucket, path: full, size: Number(meta.size ?? 0) })
      }
    }
    if (rows.length < 1000) break
    offset += rows.length
  }
  return out
}

export interface PhotoRef {
  id: string
  client_id: string
  log_date: string
  storage_path: string
  thumb_path: string | null
}

export interface DocRef {
  id: string
  client_id: string
  title: string
  storage_path: string
}

export interface ClientUsage {
  id: string
  name: string
  bytes: number
  files: number
  active: boolean
}

export interface BigFile extends StoredObject {
  kind: 'foto' | 'documento' | 'huérfano'
  label: string
  clientName: string
  rowId: string | null
}

export interface ExtUsage {
  ext: string
  bytes: number
  files: number
}

export interface HeavyDoc {
  doc: DocRef
  size: number
  ext: string
}

export interface StorageReport {
  total: number
  photoBytes: number
  photoFiles: number
  docBytes: number
  docFiles: number
  /** Archivos en el almacén que ya no están en la base de datos (basura). */
  orphans: StoredObject[]
  orphanBytes: number
  /** Fotos cuyo original pesa de más y se pueden recomprimir. */
  heavy: { photo: PhotoRef; size: number }[]
  heavyBytes: number
  byClient: ClientUsage[]
  bigFiles: BigFile[]
  /** Reparto de los documentos por formato, para saber qué pesa de verdad. */
  docsByExt: ExtUsage[]
  /** Documentos que se pueden comprimir (PDF e imágenes). */
  heavyDocs: HeavyDoc[]
  heavyDocBytes: number
}

/** Analiza todo el almacenamiento: qué ocupa, qué sobra y qué se puede optimizar. */
export async function analyzeStorage(): Promise<StorageReport> {
  const [photoObjs, docObjs, photoRows, docRows, profRows] = await Promise.all([
    listPrefix(PHOTO_BUCKET, ''),
    listPrefix(DOC_BUCKET, ''),
    supabase.from('progress_photos').select('id, client_id, log_date, storage_path, thumb_path'),
    supabase.from('documents').select('id, client_id, title, storage_path'),
    supabase.from('profiles').select('id, full_name, status, role'),
  ])

  const photos = (photoRows.data ?? []) as PhotoRef[]
  const docs = (docRows.data ?? []) as DocRef[]
  const profiles = (profRows.data ?? []) as { id: string; full_name: string | null; status: string | null; role: string }[]

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name || 'Sin nombre']))
  const activeById = new Map(profiles.map((p) => [p.id, (p.status ?? 'active') === 'active']))

  const photoSizes = new Map(photoObjs.map((o) => [o.path, o.size]))

  // Rutas que SÍ están referenciadas en la base de datos.
  const livePhoto = new Set<string>()
  for (const p of photos) {
    livePhoto.add(p.storage_path)
    if (p.thumb_path) livePhoto.add(p.thumb_path)
  }
  const liveDoc = new Set(docs.map((d) => d.storage_path))

  const orphans = [
    ...photoObjs.filter((o) => !livePhoto.has(o.path)),
    ...docObjs.filter((o) => !liveDoc.has(o.path)),
  ]

  // Fotos pesadas: el original ocupa más de lo que debería.
  const heavy = photos
    .map((photo) => ({ photo, size: photoSizes.get(photo.storage_path) ?? 0 }))
    .filter((h) => h.size > HEAVY_PHOTO_BYTES)
    .sort((a, b) => b.size - a.size)

  // Reparto por cliente (la primera carpeta de la ruta es su id).
  const byClientMap = new Map<string, ClientUsage>()
  for (const o of [...photoObjs, ...docObjs]) {
    const id = o.path.split('/')[0]
    const cur = byClientMap.get(id) ?? {
      id,
      name: nameById.get(id) ?? 'Cliente eliminado',
      bytes: 0,
      files: 0,
      active: activeById.get(id) ?? false,
    }
    cur.bytes += o.size
    cur.files += 1
    byClientMap.set(id, cur)
  }

  // Los archivos más grandes, para poder borrar a mano lo que no haga falta.
  const photoLabel = new Map(photos.map((p) => [p.storage_path, p]))
  const docLabel = new Map(docs.map((d) => [d.storage_path, d]))
  const orphanSet = new Set(orphans.map((o) => o.path))
  const bigFiles: BigFile[] = [...photoObjs, ...docObjs]
    .sort((a, b) => b.size - a.size)
    .slice(0, 25)
    .map((o) => {
      const cid = o.path.split('/')[0]
      const clientName = nameById.get(cid) ?? 'Cliente eliminado'
      if (orphanSet.has(o.path)) return { ...o, kind: 'huérfano' as const, label: 'Archivo sin dueño', clientName, rowId: null }
      const p = photoLabel.get(o.path)
      if (p) return { ...o, kind: 'foto' as const, label: `Foto del ${p.log_date}`, clientName, rowId: p.id }
      const d = docLabel.get(o.path)
      if (d) return { ...o, kind: 'documento' as const, label: d.title, clientName, rowId: d.id }
      return { ...o, kind: 'huérfano' as const, label: 'Miniatura', clientName, rowId: null }
    })

  // Documentos: reparto por formato y los que se pueden comprimir.
  const docSizes = new Map(docObjs.map((o) => [o.path, o.size]))
  const extMap = new Map<string, ExtUsage>()
  for (const o of docObjs) {
    const ext = pathExt(o.path)
    const cur = extMap.get(ext) ?? { ext, bytes: 0, files: 0 }
    cur.bytes += o.size
    cur.files += 1
    extMap.set(ext, cur)
  }
  const heavyDocs: HeavyDoc[] = docs
    .map((doc) => ({ doc, size: docSizes.get(doc.storage_path) ?? 0, ext: pathExt(doc.storage_path) }))
    .filter((h) => h.size > HEAVY_DOC_BYTES && COMPRESSIBLE_DOC_EXTS.includes(h.ext))
    .sort((a, b) => b.size - a.size)

  const photoBytes = photoObjs.reduce((s, o) => s + o.size, 0)
  const docBytes = docObjs.reduce((s, o) => s + o.size, 0)

  return {
    total: photoBytes + docBytes,
    photoBytes,
    photoFiles: photoObjs.length,
    docBytes,
    docFiles: docObjs.length,
    orphans,
    orphanBytes: orphans.reduce((s, o) => s + o.size, 0),
    heavy,
    heavyBytes: heavy.reduce((s, h) => s + h.size, 0),
    byClient: [...byClientMap.values()].sort((a, b) => b.bytes - a.bytes),
    bigFiles,
    docsByExt: [...extMap.values()].sort((a, b) => b.bytes - a.bytes),
    heavyDocs,
    heavyDocBytes: heavyDocs.reduce((s, h) => s + h.size, 0),
  }
}

/** Borra los archivos huérfanos (no están en la base de datos: nadie los ve). */
export async function deleteOrphans(orphans: StoredObject[]): Promise<number> {
  let done = 0
  for (const bucket of [PHOTO_BUCKET, DOC_BUCKET]) {
    const paths = orphans.filter((o) => o.bucket === bucket).map((o) => o.path)
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await supabase.storage.from(bucket).remove(chunk)
      if (error) throw error
      done += chunk.length
    }
  }
  return done
}

/** Reescala una imagen (Blob) y la devuelve como JPEG comprimido. */
async function shrink(blob: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  } catch {
    return null
  }
}

/**
 * Recomprime una foto ya subida: la baja, la reescala a 1600 px y la vuelve a
 * subir en su sitio. La foto sigue existiendo y se ve igual de bien en el
 * móvil, pero ocupa una fracción. Devuelve los bytes ahorrados.
 */
export async function optimizePhoto(photo: PhotoRef, originalSize: number): Promise<number> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(photo.storage_path)
  if (error || !data) return 0
  const small = await shrink(data, 1600, 0.78)
  // Si no se gana al menos un 15%, no merece la pena tocarla.
  if (!small || small.size >= originalSize * 0.85) return 0
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(photo.storage_path, small, { contentType: 'image/jpeg', upsert: true })
  if (upErr) return 0

  // Si le faltaba la miniatura, se genera ahora (la galería carga al instante).
  if (!photo.thumb_path) {
    const thumb = await shrink(data, 420, 0.7)
    if (thumb) {
      const thumbPath = `${photo.client_id}/${photo.id}_thumb.jpg`
      const { error: tErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true })
      if (!tErr) await supabase.from('progress_photos').update({ thumb_path: thumbPath }).eq('id', photo.id)
    }
  }
  return originalSize - small.size
}

/** Borra del todo un archivo de la lista de "más grandes". */
export async function deleteBigFile(f: BigFile): Promise<void> {
  const { error } = await supabase.storage.from(f.bucket).remove([f.path])
  if (error) throw error
  if (!f.rowId) return
  if (f.kind === 'foto') {
    const { data } = await supabase.from('progress_photos').select('thumb_path').eq('id', f.rowId).maybeSingle()
    const thumb = (data as { thumb_path: string | null } | null)?.thumb_path
    if (thumb) await supabase.storage.from(PHOTO_BUCKET).remove([thumb])
    await supabase.from('progress_photos').delete().eq('id', f.rowId)
  } else if (f.kind === 'documento') {
    await supabase.from('documents').delete().eq('id', f.rowId)
  }
}

/**
 * Comprime un PDF volviendo a dibujar cada página como imagen y montando un
 * PDF nuevo. Es lo que más reduce en los PDF que salen de Canva o de un
 * escáner (que por dentro ya son imágenes a resolución de imprenta).
 * Contrapartida: el texto deja de poder seleccionarse o buscarse, pero se ve
 * igual en el móvil. Devuelve null si no se puede o si no se gana nada.
 */
async function compressPdf(blob: Blob): Promise<Blob | null> {
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

    const buf = await blob.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buf }).promise
    const { jsPDF } = await import('jspdf')
    let out: InstanceType<typeof jsPDF> | null = null

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      // 1400 px de ancho: nítido en cualquier móvil y a pantalla completa.
      const scale = Math.min(2, 1400 / base.width)
      const vp = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(vp.width)
      canvas.height = Math.round(vp.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      // Fondo blanco: los PDF no lo llevan y el JPEG no admite transparencia.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const jpeg = canvas.toDataURL('image/jpeg', 0.72)
      const w = base.width
      const h = base.height
      if (!out) out = new jsPDF({ unit: 'pt', format: [w, h], orientation: w > h ? 'landscape' : 'portrait' })
      else out.addPage([w, h], w > h ? 'landscape' : 'portrait')
      out.addImage(jpeg, 'JPEG', 0, 0, w, h)
      canvas.width = 0
      canvas.height = 0
    }
    if (!out) return null
    return out.output('blob')
  } catch {
    return null
  }
}

/**
 * Comprime un documento ya subido y lo deja en su sitio (mismo enlace, mismo
 * nombre). Solo lo sustituye si se ahorra al menos un 20 %.
 * Devuelve los bytes ahorrados (0 si no se ha tocado).
 */
export async function optimizeDocument(d: HeavyDoc): Promise<number> {
  const { data, error } = await supabase.storage.from(DOC_BUCKET).download(d.doc.storage_path)
  if (error || !data) return 0

  const smaller = DOC_IMG_EXTS.includes(d.ext)
    ? await shrink(data, 2000, 0.8)
    : await compressPdf(data)
  if (!smaller || smaller.size >= d.size * 0.8) return 0

  const contentType = DOC_IMG_EXTS.includes(d.ext) ? 'image/jpeg' : 'application/pdf'
  const { error: upErr } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(d.doc.storage_path, smaller, { contentType, upsert: true })
  if (upErr) return 0
  await supabase.from('documents').update({ size_bytes: smaller.size }).eq('id', d.doc.id)
  return d.size - smaller.size
}
