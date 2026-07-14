import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getProfile, listPerimeters, listWeights, PERIMETER_FIELDS, type PerimeterLog, type WeightLog } from '../../lib/db'
import { perimeterRows, perimeterSeries, weightSeries } from '../../lib/metrics'
import MetricChart from '../MetricChart'
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
  const [perimField, setPerimField] = useState('cintura')

  useEffect(() => {
    Promise.all([listWeights(clientId), listPerimeters(clientId), getProfile(clientId)])
      .then(([w, p, prof]) => {
        setWeights(w)
        setPerims(p)
        setTarget(prof?.target_weight ?? null)
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const first = weights.length ? Number(weights[0].weight) : null
  const current = weights.length ? Number(weights[weights.length - 1].weight) : null
  const rows = perimeterRows(perims)
  const perimLabel = PERIMETER_FIELDS.find((f) => f.key === perimField)?.label ?? 'Perímetro'

  if (loading) return <div style={{ fontSize: 13, color: mut(0.4), padding: 20 }}>Cargando análisis…</div>

  if (weights.length === 0 && perims.length === 0) {
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
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 8 }}>kg · toca un punto para ver el dato</div>
        <MetricChart points={weightSeries(weights)} color={colors.accent} unit="kg" height={180} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <MiniStat label="Inicial" value={first != null ? String(first) : '—'} />
          <MiniStat label="Actual" value={current != null ? String(current) : '—'} />
          <MiniStat label="Objetivo" value={target != null ? String(target) : '—'} accent />
        </div>
      </div>

      {/* perímetro seleccionable */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Perímetro</div>
            <div style={{ fontSize: 11, color: mut(0.4) }}>cm · {perimLabel.toLowerCase()}</div>
          </div>
        </div>
        <div className="om-scroll" style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
          {PERIMETER_FIELDS.map((f) => {
            const active = f.key === perimField
            return (
              <button
                key={f.key}
                onClick={() => setPerimField(f.key)}
                style={{ flex: 'none', fontSize: 11, fontWeight: 600, background: active ? colors.amber : colors.surface2, color: active ? '#0a0a0a' : mut(0.6), border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <MetricChart points={perimeterSeries(perims, perimField)} color={colors.amber} unit="cm" height={150} showAxis={false} />
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
