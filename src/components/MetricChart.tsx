import { useState } from 'react'
import { colors, mut } from '../theme'
import { chart } from '../lib/chart'
import { shortDate } from '../lib/metrics'

export interface MetricPoint {
  date: string // YYYY-MM-DD
  value: number
  label?: string
}

interface Props {
  points: MetricPoint[]
  color?: string
  unit?: string
  height?: number
  /** Muestra la etiqueta de fecha bajo cada punto (para pocos puntos). */
  showAxis?: boolean
}

const VB_W = 700

export default function MetricChart({ points, color = colors.accent, unit = '', height = 240, showAxis = true }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <div style={{ fontSize: 12.5, color: mut(0.4), padding: '24px 0' }}>
        Hacen falta al menos 2 registros para dibujar la gráfica.
      </div>
    )
  }

  const geo = chart(points.map((p) => ({ v: p.value, m: p.label ?? '' })), VB_W, height, 18, showAxis ? 30 : 12)
  const rgb = hexToRgb(color)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${rgb}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgba(${rgb},0.32)`} />
            <stop offset="1" stopColor={`rgba(${rgb},0)`} />
          </linearGradient>
        </defs>
        <path d={geo.area} fill={`url(#grad-${rgb})`} />
        <path d={geo.line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {geo.pts.map((pt, i) => (
          <circle key={i} cx={pt.cx} cy={pt.cy} r={hover === i ? 6 : 4.5} fill={hover === i ? color : colors.bg} stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        ))}
        {showAxis &&
          geo.pts.map((pt, i) => (
            <text key={`t${i}`} x={pt.cx} y={height - 6} fill={mut(0.4)} fontSize={13} textAnchor="middle" fontFamily="Montserrat">
              {pt.label}
            </text>
          ))}
        {/* zonas de hover invisibles */}
        {geo.pts.map((pt, i) => (
          <rect
            key={`h${i}`}
            x={pt.cx - VB_W / (geo.pts.length * 2)}
            y={0}
            width={VB_W / geo.pts.length}
            height={height}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(geo.pts[hover].cx / VB_W) * 100}%`,
            top: geo.pts[hover].cy,
            transform: 'translate(-50%, -130%)',
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 8,
            padding: '6px 9px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
            zIndex: 5,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
            {points[hover].value}
            {unit && <span style={{ fontSize: 10, fontWeight: 500, color: mut(0.5) }}> {unit}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: mut(0.5), marginTop: 1 }}>{shortDate(points[hover].date)}</div>
        </div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
