import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getProfile, listPerimeters, listWeights, type PerimeterLog, type WeightLog } from '../../lib/db'
import { chart } from '../../lib/chart'
import { perimeterRows, shortDate, weightChart } from '../../lib/metrics'
import { Calendar } from '../icons'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  padding: 17,
}

export default function Analisis({ clientId }: { clientId: string }) {
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [perims, setPerims] = useState<PerimeterLog[]>([])
  const [target, setTarget] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listWeights(clientId), listPerimeters(clientId), getProfile(clientId)])
      .then(([w, p, prof]) => {
        setWeights(w)
        setPerims(p)
        setTarget(prof?.target_weight ?? null)
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const wc = weightChart(weights, 700, 240, 18, 30)
  const first = weights.length ? Number(weights[0].weight) : null
  const current = weights.length ? Number(weights[weights.length - 1].weight) : null

  const waistLogs = perims.filter((p) => p.cintura != null)
  const waistChart =
    waistLogs.length >= 2
      ? chart(waistLogs.map((p) => ({ v: Number(p.cintura), m: shortDate(p.log_date) })), 700, 200, 14, 20)
      : null
  const rows = perimeterRows(perims)

  if (loading) return <div style={{ fontSize: 13, color: mut(0.4), padding: 20 }}>Cargando análisis…</div>

  const empty = weights.length === 0 && perims.length === 0
  if (empty) {
    return (
      <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', textAlign: 'center', padding: '34px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Sin datos todavía</div>
        <div style={{ fontSize: 12.5, color: mut(0.5), lineHeight: 1.6 }}>
          Registra tu peso y tus perímetros en la pestaña Métricas y aquí verás tu evolución.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: mut(0.5) }}>Todos los resultados</div>
        <span style={{ fontSize: 11, fontWeight: 600, background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={12} stroke="currentColor" strokeWidth={2} />
          Evolución
        </span>
      </div>

      {/* peso */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Peso corporal</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 8 }}>kg · evolución</div>
        {wc ? (
          <svg viewBox="0 0 700 240" style={{ width: '100%', height: 180, display: 'block' }}>
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(219,24,9,0.35)" />
                <stop offset="1" stopColor="rgba(219,24,9,0)" />
              </linearGradient>
            </defs>
            <path d={wc.area} fill="url(#wg)" />
            <path d={wc.line} fill="none" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {wc.pts.map((pt, i) => (
              <circle key={i} cx={pt.cx} cy={pt.cy} r={4.5} fill={colors.bg} stroke={colors.accent} strokeWidth={2.5} />
            ))}
            {wc.pts.map((pt, i) => (
              <text key={i} x={pt.cx} y={234} fill={mut(0.4)} fontSize={13} textAnchor="middle" fontFamily="Montserrat">{pt.label}</text>
            ))}
          </svg>
        ) : (
          <div style={{ fontSize: 12, color: mut(0.4), padding: '20px 0' }}>Registra 2 pesos o más para ver la curva.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <MiniStat label="Inicial" value={first != null ? String(first) : '—'} />
          <MiniStat label="Actual" value={current != null ? String(current) : '—'} />
          <MiniStat label="Objetivo" value={target != null ? String(target) : '—'} accent />
        </div>
      </div>

      {/* cintura */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Cintura</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 8 }}>cm · tendencia</div>
        {waistChart ? (
          <svg viewBox="0 0 700 200" style={{ width: '100%', height: 120, display: 'block' }}>
            <path d={waistChart.area} fill="rgba(245,166,35,0.13)" />
            <path d={waistChart.line} fill="none" stroke={colors.amber} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {waistChart.pts.map((pt, i) => (
              <circle key={i} cx={pt.cx} cy={pt.cy} r={4} fill={colors.bg} stroke={colors.amber} strokeWidth={2.5} />
            ))}
          </svg>
        ) : (
          <div style={{ fontSize: 12, color: mut(0.4), padding: '10px 0' }}>Registra la cintura 2 veces o más para ver la tendencia.</div>
        )}
      </div>

      {/* cambio por perímetro */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Cambio por perímetro</div>
        {rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {rows.map((p) => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: mut(0.7), width: 74, flex: 'none' }}>{p.name}</span>
                <div style={{ flex: 1, height: 7, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: p.barW, height: '100%', background: p.dColor, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, width: 44, textAlign: 'right', flex: 'none' }}>{p.delta ?? '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: mut(0.4) }}>Aún no hay perímetros registrados.</div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(219,24,9,0.1)' : colors.surface2, border: accent ? '1px solid rgba(219,24,9,0.3)' : undefined, borderRadius: 12, padding: 11, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, color: accent ? colors.accent : undefined }}>{value}</div>
    </div>
  )
}
