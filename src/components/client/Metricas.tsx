import { colors, mut } from '../../theme'
import { sp, perimeters, clientPhotos } from '../../data'
import ImageSlot from '../ImageSlot'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
}

export default function Metricas() {
  return (
    <div>
      {/* peso */}
      <div style={{ ...card, padding: '17px 17px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: mut(0.5), fontWeight: 500 }}>Peso corporal</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>
              83.6<span style={{ fontSize: 14, fontWeight: 500, color: mut(0.5) }}> kg</span>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.green,
              background: 'rgba(74,222,128,0.12)',
              padding: '4px 9px',
              borderRadius: 999,
              marginTop: 6,
            }}
          >
            ▼ 4.8 kg
          </span>
        </div>
        <svg viewBox="0 0 320 80" style={{ width: '100%', height: 64, marginTop: 6, display: 'block' }}>
          <path d={sp.area} fill="rgba(219,24,9,0.14)" />
          <path d={sp.line} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <button
          style={{
            width: '100%',
            marginTop: 8,
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: 12,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Registrar peso de hoy
        </button>
      </div>

      {/* perímetros */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Registro de perímetros</div>
          <span style={{ fontSize: 11, color: mut(0.4) }}>últ. 13 Jul</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {perimeters.map((p) => (
            <div
              key={p.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ fontSize: 13, color: mut(0.8) }}>{p.name}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  {p.v}
                  <span style={{ fontSize: 10, color: mut(0.4) }}> cm</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, minWidth: 44, textAlign: 'right' }}>
                  {p.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          style={{
            width: '100%',
            marginTop: 12,
            background: colors.surface2,
            color: colors.text,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 11,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Registrar perímetros
        </button>
      </div>

      {/* composición */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Composición corporal</div>
        <div style={{ fontSize: 11, color: mut(0.4), margin: '3px 0 15px' }}>
          Estimada según perímetros y peso
        </div>
        <CompBar label="Grasa corporal" pct={18} delta="(−4)" fill={colors.amber} width="18%" />
        <div style={{ marginTop: 15 }}>
          <CompBar label="Masa muscular" pct={42} delta="(+2)" fill={colors.accent} width="42%" />
        </div>
      </div>

      {/* registro fotográfico */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Registro fotográfico</div>
          <span style={{ fontSize: 11, color: colors.accent, fontWeight: 600 }}>Ver todo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {clientPhotos.map((ph) => (
            <div key={ph.id} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden' }}>
              <ImageSlot placeholder="Foto" radius={12} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '14px 8px 6px',
                  background: 'linear-gradient(transparent,rgba(0,0,0,0.75))',
                  fontSize: 9.5,
                  fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                {ph.date}
              </div>
            </div>
          ))}
        </div>
        <button
          style={{
            width: '100%',
            marginTop: 12,
            background: colors.surface2,
            color: colors.text,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 11,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Añadir foto de progreso
        </button>
      </div>
    </div>
  )
}

function CompBar({
  label,
  pct,
  delta,
  fill,
  width,
}: {
  label: string
  pct: number
  delta: string
  fill: string
  width: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: mut(0.7) }}>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {pct}% <span style={{ color: colors.green, fontWeight: 500 }}>{delta}</span>
        </span>
      </div>
      <div style={{ height: 9, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width, height: '100%', background: fill, borderRadius: 999 }} />
      </div>
    </div>
  )
}
