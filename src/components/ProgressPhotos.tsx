import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../theme'
import { addPhoto, deletePhoto, listPhotos, listWeights, type PhotoWithUrl } from '../lib/db'
import { shortDate } from '../lib/metrics'

// Foto elegida para la comparativa / informe (foto + peso registrado más cercano).
export interface ComparePhoto {
  url: string | null
  date: string
  weight: number | null
}
export type ComparePair = { before: ComparePhoto; after: ComparePhoto }

interface Props {
  clientId: string
  canUpload?: boolean
  /** Nº de columnas del grid. */
  columns?: number
  /** Permite tocar 2 fotos para compararlas (y usarlas en el informe). */
  selectable?: boolean
  /** Devuelve la pareja seleccionada (o null) al contenedor. */
  onCompareChange?: (pair: ComparePair | null) => void
}

export default function ProgressPhotos({ clientId, canUpload = false, columns = 3, selectable = false, onCompareChange }: Props) {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [weights, setWeights] = useState<{ log_date: string; weight: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([]) // ids en orden de selección (máx 2)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    try {
      setErr(null)
      const [ph, w] = await Promise.all([listPhotos(clientId), selectable ? listWeights(clientId) : Promise.resolve([])])
      setPhotos(ph)
      setWeights(w.map((x) => ({ log_date: x.log_date, weight: Number(x.weight) })))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setLoading(false)
    }
  }, [clientId, selectable])

  useEffect(() => {
    reload()
  }, [reload])

  // Peso registrado en la fecha más cercana a la de la foto.
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

  // Avisa al contenedor de la pareja seleccionada (para el informe).
  useEffect(() => {
    if (!onCompareChange) return
    if (selected.length === 2) {
      const a = photos.find((p) => p.id === selected[0])
      const b = photos.find((p) => p.id === selected[1])
      if (a && b) {
        onCompareChange({
          before: { url: a.url, date: a.log_date, weight: weightAt(a.log_date) },
          after: { url: b.url, date: b.log_date, weight: weightAt(b.log_date) },
        })
        return
      }
    }
    onCompareChange(null)
  }, [selected, photos, onCompareChange, weightAt])

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length < 2) return [...cur, id]
      return [cur[1], id] // ya hay 2: descarta la más antigua
    })
  }

  const onFile = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setErr(null)
    try {
      await addPhoto(clientId, file)
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

  const selA = photos.find((p) => p.id === selected[0])
  const selB = photos.find((p) => p.id === selected[1])

  return (
    <div>
      {err && (
        <div style={{ fontSize: 12, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* comparativa compacta cuando hay 2 seleccionadas */}
      {selectable && selA && selB && (
        <CompareStrip
          before={{ url: selA.url, date: selA.log_date, weight: weightAt(selA.log_date) }}
          after={{ url: selB.url, date: selB.log_date, weight: weightAt(selB.log_date) }}
          onClear={() => setSelected([])}
        />
      )}

      {selectable && photos.length >= 2 && selected.length < 2 && (
        <div style={{ fontSize: 11.5, color: mut(0.45), marginBottom: 10 }}>
          Toca 2 fotos para comparar (1ª = antes, 2ª = después).
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: '10px 0' }}>Cargando fotos…</div>
      ) : photos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: canUpload ? '6px 0 12px' : '20px 0' }}>
          {canUpload ? 'Aún no has subido ninguna foto.' : 'El cliente todavía no ha subido fotos.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 10 }}>
          {photos.map((p) => {
            const pos = selected.indexOf(p.id) // -1, 0 (antes) o 1 (después)
            const isSel = pos >= 0
            return (
              <div
                key={p.id}
                onClick={selectable ? () => toggleSelect(p.id) : undefined}
                style={{
                  position: 'relative',
                  aspectRatio: '3 / 4',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#161616',
                  border: isSel ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.06)',
                  cursor: selectable ? 'pointer' : 'default',
                }}
              >
                {p.url ? (
                  <img src={p.url} alt={p.log_date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: mut(0.3) }}>Foto</div>
                )}
                {isSel && (
                  <span style={{ position: 'absolute', top: 6, left: 6, background: colors.accent, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                    {pos === 0 ? 'ANTES' : 'DESPUÉS'}
                  </span>
                )}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent,rgba(0,0,0,0.8))', fontSize: 10.5, fontWeight: 600, pointerEvents: 'none' }}>
                  {shortDate(p.log_date)}
                </div>
                {canUpload && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(p)
                    }}
                    title="Eliminar"
                    style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canUpload && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ width: '100%', marginTop: 12, background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 11, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? 'Subiendo…' : '+ Añadir foto de progreso'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      )}
    </div>
  )
}

// Comparativa compacta (dos miniaturas + diferencia de peso).
function CompareStrip({ before, after, onClear }: { before: ComparePhoto; after: ComparePhoto; onClear: () => void }) {
  const diff = before.weight != null && after.weight != null ? +(after.weight - before.weight).toFixed(1) : null
  return (
    <div style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Comparativa</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: mut(0.5), fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 14 }}>
        <Mini label="Antes" photo={before} />
        <Mini label="Después" photo={after} />
      </div>
      {diff != null && (
        <div style={{ textAlign: 'center', fontSize: 12, color: mut(0.6), marginTop: 10 }}>
          Diferencia:{' '}
          <b style={{ color: diff <= 0 ? colors.green : colors.amber }}>{diff > 0 ? '+' : ''}{diff} kg</b>
        </div>
      )}
    </div>
  )
}

function Mini({ label, photo }: { label: string; photo: ComparePhoto }) {
  return (
    <div style={{ width: 118 }}>
      <div style={{ fontSize: 9.5, letterSpacing: 1, color: mut(0.45), fontWeight: 700, marginBottom: 5, textAlign: 'center' }}>{label.toUpperCase()}</div>
      <div style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden', background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}>
        {photo.url ? (
          <img src={photo.url} alt={photo.date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: mut(0.3) }}>—</div>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, marginTop: 5 }}>
        <div style={{ fontWeight: 600 }}>{shortDate(photo.date)}</div>
        {photo.weight != null && <div style={{ color: mut(0.55) }}>{photo.weight} kg</div>}
      </div>
    </div>
  )
}
