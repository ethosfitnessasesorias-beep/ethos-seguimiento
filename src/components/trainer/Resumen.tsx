import { colors, mut } from '../../theme'
import { activity, cumplimiento, upcoming } from '../../data'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
}

export default function Resumen() {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Resumen</div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Buen día, Luis. Esto es lo que pasa con tus clientes hoy.
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <Kpi label="Clientes activos" value="6" />
        <Kpi label="Adherencia media" value="73%" color={colors.amber} />
        <Kpi label="Tareas pendientes" value="12" />
        <Kpi label="Formularios sin revisar" value="3" color={colors.accent} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* actividad reciente */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '11px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    flex: 'none',
                    borderRadius: '50%',
                    background: colors.surface2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: mut(0.7),
                  }}
                >
                  {a.ini}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>{' '}
                    <span style={{ color: mut(0.55) }}>{a.action}</span>
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: a.color,
                        background: a.bg,
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {a.tag}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: mut(0.4), flex: 'none' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* side column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Revisar cumplimiento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cumplimiento.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      flex: 'none',
                      borderRadius: '50%',
                      background: colors.surface2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: mut(0.7),
                    }}
                  >
                    {c.ini}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.adh}%</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Próximos eventos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {upcoming.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${u.color}`, paddingLeft: 11 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{u.label}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: mut(0.6) }}>{u.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: mut(0.5) }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color }}>{value}</div>
    </div>
  )
}
