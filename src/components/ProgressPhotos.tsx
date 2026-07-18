import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../theme'
import {
  addPhoto,
  createPhotoFolder,
  deletePhoto,
  deletePhotoFolder,
  listPhotoFolders,
  listPhotos,
  listWeights,
  movePhoto,
  type PhotoFolder,
  type PhotoWithUrl,
} from '../lib/db'
import { addDocument } from '../lib/documents'
import { sendNow } from '../lib/messages'
import { shortDate } from '../lib/metrics'
import { buildComparisonBlob, downloadBlob } from '../lib/photoCompare'

export interface ComparePhoto {
  url: string | null
  date: string
  weight: number | null
}
export type ComparePair = { before: ComparePhoto; after: ComparePhoto }

interface Props {
  clientId: string
  canUpload?: boolean
  columns?: number
  selectable?: boolean
  onCompareChange?: (pair: ComparePair | null) => void
  /** El entrenador puede enviar la comparativa al cliente. */
  allowSendToClient?: boolean
  /** Al cambiar (incrementar), abre el selector de archivo automáticamente. */
  autoPick?: number
}

export default function ProgressPhotos({ clientId, canUpload = false, columns = 4, selectable = false, onCompareChange, allowSendToClient = false, autoPick = 0 }: Props) {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [folders, setFolders] = useState<PhotoFolder[]>([])
  const [weights, setWeights] = useState<{ log_date: string; weight: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [targetFolder, setTargetFolder] = useState<string>('')
  const [targetDate, setTargetDate] = useState<string>('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    try {
      setErr(null)
      const [ph, fo, w] = await Promise.all([
        listPhotos(clientId),
        listPhotoFolders(clientId),
        selectable || allowSendToClient ? listWeights(clientId) : Promise.resolve([]),
      ])
      setPhotos(ph)
      setFolders(fo)
      setWeights(w.map((x) => ({ log_date: x.log_date, weight: Number(x.weight) })))
      // Por defecto, las carpetas con nombre arrancan plegadas (para no ocupar).
      setCollapsed(new Set(fo.map((f) => f.id)))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setLoading(false)
    }
  }, [clientId, selectable, allowSendToClient])

  useEffect(() => {
    reload()
  }, [reload])

  // Abre el selector de archivo cuando llega la señal (desde un evento de agenda).
  useEffect(() => {
    if (autoPick > 0 && canUpload) inputRef.current?.click()
  }, [autoPick, canUpload])

  const weightAt = useCallback(
    (date: string): number | null => {
      if (weights.length === 0) return null
      let best = weights[0]
      let bestDiff = Infinity
      for (const w of weights) {
        const diff = Math.abs(new Date(w.log_date).getTime() - new Date(date).getTime())
        if (diff < bestDiff) {
          bestDiff = diff
          best = w
        }
      }
      return best.weight
    },
    [weights],
  )

  const selA = photos.find((p) => p.id === selected[0])
  const selB = photos.find((p) => p.id === selected[1])

  useEffect(() => {
    if (!onCompareChange) return
    if (selA && selB) {
      onCompareChange({
        before: { url: selA.url, date: selA.log_date, weight: weightAt(selA.log_date) },
        after: { url: selB.url, date: selB.log_date, weight: weightAt(selB.log_date) },
      })
    } else onCompareChange(null)
  }, [selA, selB, onCompareChange, weightAt])

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length < 2) return [...cur, id]
      return [cur[1], id]
    })
  }

  const onFile = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setErr(null)
    try {
      await addPhoto(clientId, file, targetFolder || null, targetDate || undefined)
      await reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (p: PhotoWithUrl) => {
    if (!confirm('¿Eliminar esta foto?')) return
    try {
      await deletePhoto(p)
      setSelected((cur) => cur.filter((x) => x !== p.id))
      await reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  const newFolder = async () => {
    const name = prompt('Nombre de la carpeta (ej: "2024", "Enero", "Definición"):')
    if (!name?.trim()) return
    try {
      await createPhotoFolder(clientId, name.trim())
      await reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la carpeta.')
    }
  }
  const removeFolder = async (f: PhotoFolder) => {
    if (!confirm(`¿Eliminar la carpeta «${f.name}»? Las fotos NO se borran, quedan sin carpeta.`)) return
    await deletePhotoFolder(f.id)
    await reload()
  }
  const toggleFolder = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const groups: { folder: PhotoFolder | null; photos: PhotoWithUrl[] }[] = [
    { folder: null, photos: photos.filter((p) => !p.folder_id) },
    ...folders.map((f) => ({ folder: f, photos: photos.filter((p) => p.folder_id === f.id) })),
  ]

  return (
    <div>
      {err && (
        <div style={{ fontSize: 12, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{err}</div>
      )}

      {/* barra de herramientas */}
      {canUpload && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <select value={targetFolder} onChange={(e) => setTargetFolder(e.target.value)} style={selStyle} title="Carpeta destino de la próxima foto">
            <option value="">Sin carpeta</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} title="Fecha de la foto (por defecto hoy)" style={selStyle} />
          <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Subiendo…' : '+ Añadir foto'}
          </button>
          <button onClick={newFolder} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            + Carpeta
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      )}

      {selectable && photos.length >= 2 && (
        <div style={{ fontSize: 11.5, color: mut(0.45), marginBottom: 10 }}>
          Toca 2 fotos (1ª = antes, 2ª = después) y pulsa «Ver comparativa».
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: '10px 0' }}>Cargando fotos…</div>
      ) : photos.length === 0 && folders.length === 0 ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: canUpload ? '6px 0 12px' : '20px 0' }}>
          {canUpload ? 'Aún no hay fotos.' : 'El cliente todavía no ha subido fotos.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map((g) => {
            if (!g.folder && g.photos.length === 0) return null
            const id = g.folder?.id ?? 'root'
            const isCollapsed = g.folder ? collapsed.has(g.folder.id) : false
            return (
              <div key={id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => g.folder && toggleFolder(g.folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: g.folder ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0, color: colors.text }}>
                    {g.folder && <span style={{ fontSize: 11, color: mut(0.4) }}>{isCollapsed ? '▸' : '▾'}</span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{g.folder ? `📁 ${g.folder.name}` : 'Sin carpeta'}</span>
                    <span style={{ fontSize: 11, color: mut(0.4) }}>{g.photos.length}</span>
                  </button>
                  {canUpload && g.folder && (
                    <button onClick={() => removeFolder(g.folder!)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar carpeta</button>
                  )}
                </div>
                {!isCollapsed && (
                  g.photos.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: mut(0.35), padding: '0 0 6px 4px' }}>Carpeta vacía. Elígela arriba antes de subir, o mueve fotos aquí.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 7 }}>
                      {g.photos.map((p) => {
                        const pos = selected.indexOf(p.id)
                        const isSel = pos >= 0
                        return (
                          <div
                            key={p.id}
                            onClick={selectable ? () => toggleSelect(p.id) : undefined}
                            style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 9, overflow: 'hidden', background: '#161616', border: isSel ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.06)', cursor: selectable ? 'pointer' : 'default' }}
                          >
                            {p.url ? (
                              <img src={p.url} alt={p.log_date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: mut(0.3) }}>Foto</div>
                            )}
                            {isSel && (
                              <span style={{ position: 'absolute', top: 4, left: 4, background: colors.accent, color: '#fff', fontSize: 8.5, fontWeight: 700, padding: '2px 5px', borderRadius: 999 }}>{pos === 0 ? 'ANTES' : 'DESPUÉS'}</span>
                            )}
                            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 6px 4px', background: 'linear-gradient(transparent,rgba(0,0,0,0.8))', fontSize: 9.5, fontWeight: 600, pointerEvents: 'none' }}>{shortDate(p.log_date)}</div>
                            {canUpload && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); remove(p) }} title="Eliminar" style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                                <select
                                  value={p.folder_id ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => { movePhoto(p.id, e.target.value || null).then(reload) }}
                                  title="Mover a carpeta"
                                  style={{ position: 'absolute', bottom: 3, right: 3, maxWidth: 66, background: 'rgba(0,0,0,0.65)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, fontSize: 9, padding: '1px 2px', fontFamily: 'inherit' }}
                                >
                                  <option value="">— sin —</option>
                                  {folders.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* barra flotante de comparación */}
      {selectable && selA && selB && (
        <button onClick={() => setShowCompare(true)} style={{ position: 'sticky', bottom: 8, marginTop: 12, width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(219,24,9,0.35)' }}>
          Ver comparativa
        </button>
      )}

      {showCompare && selA && selB && (
        <CompareModal
          clientId={clientId}
          allowSendToClient={allowSendToClient}
          before={{ url: selA.url, date: selA.log_date, weight: weightAt(selA.log_date) }}
          after={{ url: selB.url, date: selB.log_date, weight: weightAt(selB.log_date) }}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  )
}

const selStyle: React.CSSProperties = {
  background: colors.surface2,
  color: colors.text,
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '9px 10px',
  fontFamily: 'inherit',
  fontSize: 12.5,
  outline: 'none',
}

// ---------- Comparativa a pantalla completa ----------
function CompareModal({ clientId, before, after, allowSendToClient, onClose }: { clientId: string; before: ComparePhoto; after: ComparePhoto; allowSendToClient: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState<null | 'download' | 'send'>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const diff = before.weight != null && after.weight != null ? +(after.weight - before.weight).toFixed(1) : null

  const download = async () => {
    setBusy('download')
    setMsg(null)
    try {
      const blob = await buildComparisonBlob(before, after)
      downloadBlob(blob, 'comparativa-ethos.png')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo generar la imagen.')
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    setBusy('send')
    setMsg(null)
    try {
      const blob = await buildComparisonBlob(before, after)
      const file = new File([blob], 'comparativa.png', { type: 'image/png' })
      await addDocument(clientId, file, `Comparativa de progreso`, 'Guía')
      await sendNow(clientId, '📸 Tu entrenador te ha enviado una comparativa de tu progreso. La tienes en Documentos.').catch(() => {})
      setMsg('¡Enviada al cliente! La verá en Documentos.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo enviar.')
    } finally {
      setBusy(null)
    }
  }

  const pane = (label: string, p: ComparePhoto) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: mut(0.5), fontWeight: 700, marginBottom: 7 }}>{label.toUpperCase()}</div>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
        {p.url ? <img src={p.url} alt="" style={{ width: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block' }} /> : <div style={{ padding: 40, color: mut(0.3) }}>—</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{shortDate(p.date)}</div>
      {p.weight != null && <div style={{ fontSize: 12, color: mut(0.6) }}>{p.weight} kg</div>}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Comparativa de progreso</div>
          <button onClick={onClose} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, width: 36, height: 36, color: mut(0.7), cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {pane('Antes', before)}
          {pane('Después', after)}
        </div>
        {diff != null && (
          <div style={{ textAlign: 'center', fontSize: 15, marginTop: 14 }}>
            Diferencia: <b style={{ color: diff <= 0 ? colors.green : colors.amber }}>{diff > 0 ? '+' : ''}{diff} kg</b>
          </div>
        )}
        {msg && <div style={{ textAlign: 'center', fontSize: 12.5, color: msg.startsWith('¡') ? colors.green : '#f5a99f', marginTop: 10 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={download} disabled={!!busy} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 11, padding: '12px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {busy === 'download' ? 'Generando…' : '↓ Descargar'}
          </button>
          {allowSendToClient && (
            <button onClick={send} disabled={!!busy} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '12px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {busy === 'send' ? 'Enviando…' : '✈ Enviar al cliente'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
