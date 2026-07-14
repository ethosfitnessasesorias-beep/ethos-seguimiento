import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../theme'
import { addPhoto, deletePhoto, listPhotos, type PhotoWithUrl } from '../lib/db'
import { shortDate } from '../lib/metrics'

interface Props {
  clientId: string
  canUpload?: boolean
  /** Nº de columnas del grid. */
  columns?: number
}

export default function ProgressPhotos({ clientId, canUpload = false, columns = 3 }: Props) {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    try {
      setErr(null)
      setPhotos(await listPhotos(clientId))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    reload()
  }, [reload])

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
      await reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  return (
    <div>
      {err && (
        <div style={{ fontSize: 12, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {err}
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
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden', background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
              {p.url ? (
                <img src={p.url} alt={p.log_date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: mut(0.3) }}>Foto</div>
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent,rgba(0,0,0,0.8))', fontSize: 10.5, fontWeight: 600, pointerEvents: 'none' }}>
                {shortDate(p.log_date)}
              </div>
              {canUpload && (
                <button
                  onClick={() => remove(p)}
                  title="Eliminar"
                  style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
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
