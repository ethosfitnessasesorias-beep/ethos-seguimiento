import { colors, mut } from '../../theme'
import { wc, wa, perimeters } from '../../data'
import { Calendar } from '../icons'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  padding: 17,
}

export default function Analisis() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: mut(0.5) }}>Todos los resultados</div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            background: colors.surface2,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '6px 11px',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Calendar size={12} stroke="currentColor" strokeWidth={2} />
          01 Abr – 13 Jul
        </span>
      </div>

      {/* peso corporal */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Peso corporal</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 8 }}>kg · últimos 4 meses</div>
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
            <text key={i} x={pt.cx} y={234} fill={mut(0.4)} fontSize={13} textAnchor="middle" fontFamily="Montserrat">
              {pt.label}
            </text>
          ))}
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <MiniStat label="Inicial" value="88.4" />
          <MiniStat label="Actual" value="83.6" />
          <MiniStat label="Objetivo" value="80.0" accent />
        </div>
      </div>

      {/* cintura */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Cintura</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 8 }}>cm · tendencia</div>
        <svg viewBox="0 0 700 200" style={{ width: '100%', height: 120, display: 'block' }}>
          <path d={wa.area} fill="rgba(245,166,35,0.13)" />
          <path d={wa.line} fill="none" stroke={colors.amber} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {wa.pts.map((pt, i) => (
            <circle key={i} cx={pt.cx} cy={pt.cy} r={4} fill={colors.bg} stroke={colors.amber} strokeWidth={2.5} />
          ))}
        </svg>
      </div>

      {/* cambio por perímetro */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Cambio por perímetro</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {perimeters.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: mut(0.7), width: 74, flex: 'none' }}>{p.name}</span>
              <div style={{ flex: 1, height: 7, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: p.barW, height: '100%', background: p.dColor, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, width: 44, textAlign: 'right', flex: 'none' }}>
                {p.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? 'rgba(219,24,9,0.1)' : colors.surface2,
        border: accent ? '1px solid rgba(219,24,9,0.3)' : undefined,
        borderRadius: 12,
        padding: 11,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, color: accent ? colors.accent : undefined }}>
        {value}
      </div>
    </div>
  )
}
