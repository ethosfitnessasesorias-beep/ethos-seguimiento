import { supabase } from './supabase'

export const DOC_BUCKET = 'documents'

export type DocCategory = 'Entrenamiento' | 'Nutrición' | 'Guía' | 'Contrato'

export const DOC_CATEGORIES: { key: DocCategory; color: string; bg: string }[] = [
  { key: 'Entrenamiento', color: '#db1809', bg: 'rgba(219,24,9,0.12)' },
  { key: 'Nutrición', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  { key: 'Guía', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { key: 'Contrato', color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
]

// Categorías que el entrenador puede elegir al subir (el contrato es automático).
export const UPLOAD_CATEGORIES = DOC_CATEGORIES.filter((c) => c.key !== 'Contrato')

export function catStyle(cat: string) {
  return DOC_CATEGORIES.find((c) => c.key === cat) ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
}

export interface DocFolder {
  id: string
  client_id: string
  name: string
  parent_id: string | null // carpeta madre (null = carpeta raíz)
  created_at: string
}

/** Carpeta con su nivel de profundidad, ya ordenada como un árbol. */
export interface FolderNode extends DocFolder {
  depth: number
  path: string // "Padre / Hija" — para los desplegables
}

/** Ordena las carpetas en árbol (padres antes que hijas) con su profundidad. */
export function folderTree(folders: DocFolder[]): FolderNode[] {
  const byParent = new Map<string | null, DocFolder[]>()
  for (const f of folders) {
    const k = f.parent_id ?? null
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(f)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name))
  const out: FolderNode[] = []
  const walk = (parent: string | null, depth: number, prefix: string) => {
    for (const f of byParent.get(parent) ?? []) {
      const path = prefix ? `${prefix} / ${f.name}` : f.name
      out.push({ ...f, depth, path })
      if (depth < 4) walk(f.id, depth + 1, path) // tope de 5 niveles
    }
  }
  walk(null, 0, '')
  return out
}

/** Ids de una carpeta y de todas sus descendientes. */
export function folderWithDescendants(folders: DocFolder[], id: string): string[] {
  const out = [id]
  const kids = folders.filter((f) => f.parent_id === id)
  for (const k of kids) out.push(...folderWithDescendants(folders, k.id))
  return out
}

export interface DocumentRow {
  id: string
  client_id: string
  title: string
  category: string
  storage_path: string
  size_bytes: number | null
  folder_id: string | null
  created_at: string
}

export interface DocumentWithUrl extends DocumentRow {
  url: string | null
}

export function humanSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Tipos que el navegador puede MOSTRAR en una pestaña. El resto (Word, Excel,
// zip…) hay que descargarlos como archivo: navegar a ellos deja la pantalla
// en blanco en la app instalada (el PWA no tiene gestor de descargas).
const INLINE_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp']

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  zip: 'application/zip',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

export function docExt(doc: DocumentRow): string {
  return (doc.storage_path.split('.').pop() || '').toLowerCase()
}

/** true si el navegador puede abrirlo en pestaña (PDF, imágenes). */
export function isViewableDoc(doc: DocumentRow): boolean {
  return INLINE_EXTS.includes(docExt(doc))
}

/**
 * Descarga un documento como archivo real: lo baja por la API (con sesión,
 * sin enlaces que caduquen) y dispara la descarga con su nombre original.
 * Funciona también dentro de la app instalada.
 */
export async function downloadDocument(doc: DocumentRow): Promise<void> {
  const { data, error } = await supabase.storage.from(DOC_BUCKET).download(doc.storage_path)
  if (error || !data) throw error ?? new Error('No se pudo descargar el documento.')
  const ext = docExt(doc)
  const base = (doc.title || 'documento').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'documento'
  const filename = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`
  const blob = data.type ? data : new Blob([data], { type: MIME_BY_EXT[ext] || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/**
 * Abre un documento visualizable (PDF, imagen) en una pestaña con un enlace
 * firmado EN ESE MOMENTO. Nunca reutiliza los enlaces de la lista: si la app
 * llevaba horas abierta o suspendida, esos enlaces ya han caducado y Supabase
 * devuelve el error "InvalidJWT / exp claim timestamp check failed".
 */
export async function openDocumentInTab(doc: DocumentRow): Promise<void> {
  // La pestaña se abre YA (dentro del gesto del usuario) y se rellena cuando
  // llega el enlace; si se abriera tras el await, Safari la bloquearía.
  const win = window.open('', '_blank')
  try {
    const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.storage_path, 600)
    if (error || !data?.signedUrl) throw error ?? new Error('No se pudo generar el enlace.')
    if (win) win.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  } catch (e) {
    win?.close()
    throw e instanceof Error ? e : new Error('No se pudo abrir el documento.')
  }
}

export async function listDocuments(clientId: string): Promise<DocumentWithUrl[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as DocumentRow[]
  if (rows.length === 0) return []
  const { data: signed } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 21600)
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }))
}

export async function addDocument(
  clientId: string,
  file: File,
  title: string,
  category: DocCategory,
  folderId?: string | null,
) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { contentType: file.type || MIME_BY_EXT[ext] || 'application/octet-stream', upsert: false })
  if (upErr) throw upErr
  const { error } = await supabase.from('documents').insert({
    client_id: clientId,
    title: title.trim() || file.name,
    category,
    storage_path: path,
    size_bytes: file.size,
    folder_id: folderId ?? null,
  })
  if (error) throw error
}

export async function deleteDocument(doc: DocumentRow) {
  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

// ---- Carpetas ----
export async function listFolders(clientId: string): Promise<DocFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as DocFolder[]
}

export async function createFolder(clientId: string, name: string, parentId?: string | null): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .insert({ client_id: clientId, name: name.trim(), parent_id: parentId ?? null })
  if (error) throw error
}

// Borra la carpeta (y sus subcarpetas, en cascada). Los documentos NO se
// eliminan: quedan sin carpeta.
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('document_folders').delete().eq('id', id)
  if (error) throw error
}

// Mueve una carpeta dentro de otra (o a la raíz con null).
export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  const { error } = await supabase.from('document_folders').update({ parent_id: parentId }).eq('id', id)
  if (error) throw error
}

export async function moveDocument(docId: string, folderId: string | null): Promise<void> {
  const { error } = await supabase.from('documents').update({ folder_id: folderId }).eq('id', docId)
  if (error) throw error
}

// Cambia la categoría de un documento ya subido.
export async function setDocumentCategory(docId: string, category: DocCategory): Promise<void> {
  const { error } = await supabase.from('documents').update({ category }).eq('id', docId)
  if (error) throw error
}
