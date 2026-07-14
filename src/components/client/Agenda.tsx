import { colors, mut } from '../../theme'
import { evTypes, evByDay, startDow, daysInMonth, today, weekdays, legend } from '../../data'

interface Props {
  calDay: number
  setCalDay: (d: number) => void
}

export default function Agenda({ calDay, setCalDay }: Props) {
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startDow + 1
    const inM = day >= 1 && day <= daysInMonth
    const evs = inM && evByDay[day] ? evByDay[day].map((k) => ({ color: evTypes[k].color })) : []
    const sel = inM && day === calDay
    return {
      key: i,
      day,
      inM,
      num: inM ? String(day) : '',
      events: evs.slice(0, 3),
      bg: sel ? 'rgba(219,24,9,0.16)' : 'transparent',
      border: sel
        ? `1px solid ${colors.accent}`
        : inM && day === today
          ? '1px solid rgba(255,255,255,0.14)'
          : '1px solid transparent',
      numColor: inM ? (sel ? colors.text : mut(0.82)) : 'transparent',
    }
  })

  const dayKeys = evByDay[calDay] || []
  const dayAgenda = dayKeys.map((k) => ({
    label: evTypes[k].label,
    color: evTypes[k].color,
    detail: evTypes[k].detail,
    time: evTypes[k].time,
  }))
  const selDayLabel = calDay + ' de julio'

  return (
    <div>
      {/* month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn>‹</NavBtn>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Julio 2026</div>
          <NavBtn>›</NavBtn>
        </div>
        <button
          style={{
            fontSize: 12,
            fontWeight: 600,
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '7px 13px',
            cursor: 'pointer',
          }}
          onClick={() => setCalDay(today)}
        >
          Hoy
        </button>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {legend.map((l) => (
          <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: mut(0.65) }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* calendar grid */}
      <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {weekdays.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: mut(0.35) }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((c) => (
            <button
              key={c.key}
              onClick={() => c.inM && setCalDay(c.day)}
              style={{
                aspectRatio: '1 / 1.15',
                background: c.bg,
                border: c.border,
                borderRadius: 9,
                cursor: 'pointer',
                padding: '4px 0 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 600, color: c.numColor }}>{c.num}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {c.events.map((e, i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: e.color }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* day agenda */}
      <div style={{ margin: '18px 4px 10px', fontSize: 13, fontWeight: 700 }}>Agenda · {selDayLabel}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {dayAgenda.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              background: colors.surface1,
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${a.color}`,
              borderRadius: 12,
              padding: '13px 15px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{a.detail}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.time}</span>
          </div>
        ))}
        {dayAgenda.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: mut(0.35),
              padding: 22,
              background: colors.surface1,
              borderRadius: 12,
            }}
          >
            Sin eventos este día
          </div>
        )}
      </div>
    </div>
  )
}

function NavBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: colors.surface2,
        border: '1px solid rgba(255,255,255,0.08)',
        color: colors.text,
        cursor: 'pointer',
        fontSize: 14,
      }}
    >
      {children}
    </button>
  )
}
