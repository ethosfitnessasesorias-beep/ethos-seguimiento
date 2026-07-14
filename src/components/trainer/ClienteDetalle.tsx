import { colors, mut } from '../../theme'
import { clients, wc, perimeters, trainerPhotos, forms } from '../../data'
import type { TrainerTab } from './TrainerApp'
import ImageSlot from '../ImageSlot'

interface Props {
  selIdx: number
  tTab: TrainerTab
  setTTab: (t: TrainerTab) => void
  goClientes: () => void
}

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
}

export default function ClienteDetalle({ selIdx, tTab, setTTab, goClientes }: Props) {
  const sel = clients[selIdx] || clients[0]

  const subTab = (key: TrainerTab, label: string) => {
    const active = tTab === key
    return (
      <button
        onClick={() => setTTab(key)}
        style={{
          background: 'none',
          border: 'none',
          borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`,
          color: active ? colors.text : mut(0.5),
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          padding: '11px 6px',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div>
      {/* breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18 }}>
        <span onClick={goClientes} style={{ color: mut(0.5), cursor: 'pointer' }}>
          Clientes
        </span>
        <span style={{ color: mut(0.3) }}>/</span>
        <span style={{ color: colors.accent, fontWeight: 600 }}>{sel.name}</span>
      </div>

      {/* header */}
      <div style={{ ...card, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px', marginBottom: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            flex: 'none',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#db1809,#7a0d04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {sel.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{sel.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(219,24,9,0.12)',
                border: '1px solid rgba(219,24,9,0.3)',
                color: '#f5a99f',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              Plan {sel.plan}
            </span>
            <span style={{ fontSize: 12, color: mut(0.5) }}>Alta: 12 May 2026</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          <HeaderStat label="Peso actual" value="83.6" />
          <HeaderStat label="Objetivo" value="80.0" color={colors.accent} />
          <HeaderStat label="Adherencia" value={`${sel.adherence}%`} color={sel.color} />
        </div>
      </div>

      {/* sub tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 22 }}>
        {subTab('evolucion', 'Evolución')}
        {subTab('fotos', 'Control fotográfico')}
        {subTab('formularios', 'Formularios')}
      </div>

      {tTab === 'evolucion' && <Evolucion />}
      {tTab === 'fotos' && <Fotos name={sel.name} />}
      {tTab === 'formularios' && <Formularios />}
    </div>
  )
}

function HeaderStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color }}>{value}</div>
    </div>
  )
}

function Evolucion() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Evolución de peso</div>
            <div style={{ fontSize: 11, color: mut(0.4), marginTop: 2 }}>kg · Abr – Jul 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill active>Peso</Pill>
            <Pill>Cintura</Pill>
            <Pill>Grasa</Pill>
          </div>
        </div>
        <svg viewBox="0 0 700 240" style={{ width: '100%', height: 280, display: 'block' }}>
          <defs>
            <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(219,24,9,0.35)" />
              <stop offset="1" stopColor="rgba(219,24,9,0)" />
            </linearGradient>
          </defs>
          <path d={wc.area} fill="url(#wg2)" />
          <path d={wc.line} fill="none" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {wc.pts.map((pt, i) => (
            <circle key={i} cx={pt.cx} cy={pt.cy} r={4.5} fill={colors.surface1} stroke={colors.accent} strokeWidth={2.5} />
          ))}
          {wc.pts.map((pt, i) => (
            <text key={i} x={pt.cx} y={234} fill={mut(0.4)} fontSize={13} textAnchor="middle" fontFamily="Montserrat">
              {pt.label}
            </text>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Resumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SummaryRow label="Peso inicial" value="88.4 kg" />
            <SummaryRow label="Peso actual" value="83.6 kg" />
            <SummaryRow label="Objetivo" value="80.0 kg" valueColor={colors.accent} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <SummaryRow label="Progreso" value="−4.8 kg (57%)" valueColor={colors.green} bold />
          </div>
        </div>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Perímetros</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {perimeters.map((p) => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: 12.5, color: mut(0.75) }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.v} cm</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, width: 42, textAlign: 'right' }}>
                    {p.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        background: active ? colors.accent : colors.surface2,
        color: active ? '#fff' : mut(0.6),
        border: active ? undefined : '1px solid rgba(255,255,255,0.08)',
        padding: '6px 12px',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}

function SummaryRow({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string
  value: string
  valueColor?: string
  bold?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: mut(0.55) }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color: valueColor }}>{value}</span>
    </div>
  )
}

function Fotos({ name }: { name: string }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: mut(0.5), marginBottom: 16 }}>
        Fotos de progreso subidas por {name}, ordenadas por fecha.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {trainerPhotos.map((ph) => (
          <div key={ph.id} style={{ ...card, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '3 / 4' }}>
              <ImageSlot placeholder="Foto de progreso" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{ph.date}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.accent,
                  background: 'rgba(219,24,9,0.12)',
                  padding: '3px 9px',
                  borderRadius: 999,
                }}
              >
                {ph.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Formularios() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {forms.map((f, i) => (
        <div key={i} style={{ ...card, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{f.type}</span>
            <span style={{ fontSize: 11, color: mut(0.45) }}>{f.date}</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 600,
                color: f.stColor,
                background: f.stBg,
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              {f.status}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {f.q.map((qa, j) => (
              <div key={j}>
                <div style={{ fontSize: 12, color: mut(0.5), marginBottom: 3 }}>{qa.q}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{qa.a}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
