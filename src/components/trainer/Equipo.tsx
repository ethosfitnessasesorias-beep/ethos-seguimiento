import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getTeamSummary, type TeamRow } from '../../lib/dashboard'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function Equipo({ myId }: { myId: string }) {
  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getTeamSummary()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error al cargar el equipo.'))
      .finally(() => setLoading(false))
  }, [])

  const totalClients = rows.reduce((s, r) => s + r.clients, 0)

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Equipo</div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Cada entrenador ve solo sus clientes. Aquí tenéis el resumen de todo el equipo.
      </div>

      {err && (
        <div style={{ fontSize: 13, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          {err} <span style={{ color: mut(0.5) }}>(¿ejecutaste el SQL de esta versión?)</span>
        </div>
      )}

      {!loading && !err && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 22 }}>
          <Kpi label="Entrenadores" value={String(rows.length)} />
          <Kpi label="Clientes totales" value={String(totalClients)} />
          <Kpi label="Adherencia media equipo" value={`${rows.length ? Math.round(rows.reduce((s, r) => s + r.avg_adherence, 0) / rows.length) : 0}%`} />
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4) }}>Cargando…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {rows.map((r) => (
            <div key={r.trainer_id} style={{ ...card, padding: 20, border: r.trainer_id === myId ? '1px solid rgba(219,24,9,0.4)' : card.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                  {initials(r.trainer_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {r.trainer_name || 'Entrenador'}
                    {r.trainer_id === myId && <span style={{ fontSize: 10, color: colors.accent, marginLeft: 8, fontWeight: 600 }}>· tú</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>{r.clients} {r.clients === 1 ? 'cliente' : 'clientes'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat label="Adherencia media" value={`${r.avg_adherence}%`} color={adhColor(r.avg_adherence)} />
                <Stat label="Permanencia media" value={`${r.avg_months} m`} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: mut(0.35), marginTop: 22, lineHeight: 1.6 }}>
        Para <b style={{ color: mut(0.6) }}>añadir un nuevo entrenador</b> al equipo se crea su cuenta en Supabase (te guío cuando quieras). La reasignación de clientes entre entrenadores y el control total llegarán en una mejora posterior.
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: mut(0.5) }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: colors.surface2, borderRadius: 12, padding: '12px 13px' }}>
      <div style={{ fontSize: 10.5, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color }}>{value}</div>
    </div>
  )
}
