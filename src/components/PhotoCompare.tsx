import { useEffect, useState } from 'react'
import { colors, mut } from '../theme'
import { listPhotos, listWeights, type PhotoWithUrl } from '../lib/db'
import { shortDate } from '../lib/metrics'

// Comparador de fotos antes / después. Se elige una foto a cada lado y se
// muestran juntas con su fecha y el peso registrado más cercano a esa fecha.
export default function PhotoCompare({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [weights, setWeights] = useState<{ log_date: string; weight: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [aIdx, setAIdx] = useState(0)
  const [bIdx, setBIdx] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([listPhotos(clientId), listWeights(clientId)])
      .then(([ph, w]) => {
        if (!alive) return
        setPhotos(ph)
        setWeights(w.map((x) => ({ log_date: x.log_date, weight: Number(x.weight) })))
        setAIdx(0)
        setBIdx(ph.length - 1)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [clientId])

  // Peso registrado en la fecha más cercana a la de la foto.
  const weightAt = (date: string): number | null => {
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
  }

  if (loading) return <div style={{ fontSize: 12.5, color: mut(0.4), padding: '10px 0' }}>Cargando fotos…</div>
  if (photos.length < 2) {
    return (
      <div style={{ fontSize: 12.5, color: mut(0.4), padding: '10px 0' }}>
        Se necesitan al menos 2 fotos para comparar.
      </div>
    )
  }

  const a = photos[aIdx]
  const b = photos[bIdx]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ComparePane label="Antes" photo={a} weight={a ? weightAt(a.log_date) : null} />
        <ComparePane label="Después" photo={b} weight={b ? weightAt(b.log_date) : null} />
      </div>

      {/* selectores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <PhotoSelect photos={photos} value={aIdx} onChange={setAIdx} />
        <PhotoSelect photos={photos} value={bIdx} onChange={setBIdx} />
      </div>

      {/* diferencia de peso */}
      {a && b && weightAt(a.log_date) != null && weightAt(b.log_date) != null && (
        <DiffBadge from={weightAt(a.log_date) as number} to={weightAt(b.log_date) as number} />
      )}
    </div>
  )
}

function ComparePane({ label, photo, weight }: { label: string; photo?: PhotoWithUrl; weight: number | null }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: 1, color: mut(0.45), fontWeight: 700, marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden', background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
        {photo?.url ? (
          <img src={photo.url} alt={photo.log_date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: mut(0.3) }}>Sin foto</div>
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 10px 8px', background: 'linear-gradient(transparent,rgba(0,0,0,0.85))', pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{photo ? shortDate(photo.log_date) : '—'}</div>
          {weight != null && <div style={{ fontSize: 11, color: mut(0.7), marginTop: 1 }}>{weight} kg</div>}
        </div>
      </div>
    </div>
  )
}

function PhotoSelect({ photos, value, onChange }: { photos: PhotoWithUrl[]; value: number; onChange: (i: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 10px', color: colors.text, fontFamily: 'inherit', fontSize: 12.5, outline: 'none' }}
    >
      {photos.map((p, i) => (
        <option key={p.id} value={i} style={{ background: colors.surface2 }}>
          {shortDate(p.log_date)}
        </option>
      ))}
    </select>
  )
}

function DiffBadge({ from, to }: { from: number; to: number }) {
  const diff = +(to - from).toFixed(1)
  const good = diff <= 0
  return (
    <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: mut(0.6) }}>
      Diferencia de peso:{' '}
      <b style={{ color: good ? colors.green : colors.amber }}>
        {diff > 0 ? '+' : ''}
        {diff} kg
      </b>
    </div>
  )
}
