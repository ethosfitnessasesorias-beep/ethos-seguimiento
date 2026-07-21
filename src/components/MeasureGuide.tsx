import { useState } from 'react'
import { colors, mut } from '../theme'
import Modal from './Modal'

// Botón de información (ⓘ) que abre una guía visual de cómo tomarse cada medida.
// Pensado para ponerlo junto al título de "Registrar perímetros".
const BODY = '#3a4150'
const LINE = colors.accent

const GUIDE: { n: number; label: string; tip: string }[] = [
  { n: 1, label: 'Cuello', tip: 'Rodea el cuello justo por debajo de la nuez, sin apretar.' },
  { n: 2, label: 'Pecho', tip: 'A la altura de los pezones, cinta horizontal, al terminar de soltar el aire.' },
  { n: 3, label: 'Cintura', tip: 'A la altura del ombligo, de pie y relajado (sin meter tripa).' },
  { n: 4, label: 'Cadera', tip: 'Por la parte más ancha del glúteo.' },
  { n: 5, label: 'Brazo', tip: 'En el punto más ancho del bíceps, con el brazo relajado a un lado.' },
  { n: 6, label: 'Pierna', tip: 'En la parte más ancha del muslo, de pie.' },
]

function Badge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={10} fill={LINE} />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
        {n}
      </text>
    </g>
  )
}

function BodyDiagram() {
  return (
    <svg viewBox="0 0 260 470" width="100%" style={{ maxWidth: 150, display: 'block', margin: '0 auto' }}>
      {/* brazos (detrás del torso) */}
      <g stroke={BODY} strokeWidth={20} strokeLinecap="round" fill="none">
        <line x1={170} y1={100} x2={192} y2={250} />
        <line x1={90} y1={100} x2={68} y2={250} />
      </g>
      {/* cabeza */}
      <circle cx={130} cy={40} r={26} fill={BODY} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* torso + piernas */}
      <path
        d="M122 60 L138 60 L138 78 C170 84 176 90 176 98 C176 150 166 200 158 250 C168 270 176 285 176 300 L170 452 L146 452 L136 322 Q130 314 124 322 L114 452 L90 452 L84 300 C92 285 96 270 102 250 C94 200 84 150 84 98 C84 90 90 84 122 78 Z"
        fill={BODY}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.5}
      />
      {/* líneas de medida */}
      <g stroke={LINE} strokeWidth={2} strokeDasharray="4 3">
        <line x1={106} y1={72} x2={154} y2={72} />
        <line x1={78} y1={120} x2={182} y2={120} />
        <line x1={90} y1={232} x2={170} y2={232} />
        <line x1={78} y1={302} x2={182} y2={302} />
        <line x1={176} y1={176} x2={202} y2={176} />
        <line x1={92} y1={352} x2={144} y2={352} />
      </g>
      <Badge x={100} y={72} n={1} />
      <Badge x={70} y={120} n={2} />
      <Badge x={82} y={232} n={3} />
      <Badge x={70} y={302} n={4} />
      <Badge x={210} y={176} n={5} />
      <Badge x={84} y={352} n={6} />
    </svg>
  )
}

export default function MeasureGuide() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Cómo tomarse las medidas"
        aria-label="Cómo tomarse las medidas"
        style={{
          width: 24,
          height: 24,
          flex: 'none',
          borderRadius: '50%',
          border: `1.5px solid ${colors.accent}`,
          background: 'rgba(219,24,9,0.12)',
          color: '#f5a99f',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        i
      </button>
      {open && (
        <Modal title="Cómo tomarse las medidas" onClose={() => setOpen(false)}>
          <BodyDiagram />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {GUIDE.map((g) => (
              <div key={g.n} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flex: 'none',
                    borderRadius: '50%',
                    background: colors.accent,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  {g.n}
                </span>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <b>{g.label}.</b> <span style={{ color: mut(0.7) }}>{g.tip}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 14, lineHeight: 1.6, background: colors.surface2, borderRadius: 10, padding: '10px 12px' }}>
            💡 Mídete siempre en las mismas condiciones (mejor por la mañana, en ayunas). La cinta debe quedar pegada a la piel pero sin apretar ni marcar. Mantente de pie y relajado.
          </div>
        </Modal>
      )}
    </>
  )
}
