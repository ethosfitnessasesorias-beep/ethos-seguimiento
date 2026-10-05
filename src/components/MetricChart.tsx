import { useEffect, useRef, useState } from 'react'
import { colors, mut } from '../theme'
import { chart } from '../lib/chart'
import { fullDate, shortDate } from '../lib/metrics'

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
  /** Muestra las etiquetas de fecha bajo la gráfica. */
  showAxis?: boolean
}

export default function MetricChart({ points, color = colors.accent, unit = '', height = 240, showAxis = true }: Props) {
  const [sel, setSel] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // Ancho real en píxeles: el viewBox lo usa tal cual, así la gráfica NO se
  // deforma en el móvil (antes se estiraba y el texto salía aplastado).
  const [w, setW] = useState(700)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setW(Math.max(220, Math.round(el.getBoundingClientRect().width)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const narrow = w < 420
  const h = narrow ? Math.min(height, 190) : height

  if (points.length < 2) {
    return (
      <div ref={boxRef} style={{ fontSize: 12.5, color: mut(0.4), padding: '24px 0' }}>
        Hacen falta al menos 2 registros para dibujar la gráfica.
      </div>
    )
  }

  const botPad = showAxis ? (narrow ? 26 : 30) : 12
  const geo = chart(points.map((p) => ({ v: p.value, m: p.label ?? '' })), w, h, 18, botPad)
  const rgb = hexToRgb(color)

  // Punto más cercano a una coordenada X de pantalla (para el dedo o el ratón).
  const pick = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - rect.left
    let best = 0
    let bestD = Infinity
    geo.pts.forEach((p, i) => {
      const d = Math.abs(p.cx - x)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setSel(best)
  }

  // Etiquetas del eje: en móvil solo primera y última fecha; en pantalla
  // grande, el año cada vez que cambia.
  const axisLabels: { i: number; text: string; anchor: 'start' | 'middle' | 'end' }[] = []
  if (showAxis) {
    if (narrow) {
      axisLabels.push({ i: 0, text: shortDate(points[0].date), anchor: 'start' })
      axisLabels.push({ i: points.length - 1, text: shortDate(points[points.length - 1].date), anchor: 'end' })
    } else {
      points.forEach((p, i) => {
        const yr = p.date.slice(0, 4)
        if (i === 0 || yr !== points[i - 1].date.slice(0, 4)) {
          axisLabels.push({ i, text: yr, anchor: i === 0 ? 'start' : 'middle' })
        }
      })
    }
  }

  // El globo se mantiene dentro de la tarjeta aunque el punto esté en un borde.
  const tipLeft = sel === null ? 0 : Math.min(Math.max(geo.pts[sel].cx, 58), w - 58)

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', touchAction: 'pan-y' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: h, display: 'block', overflow: 'visible' }}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setSel(null)}
        onTouchStart={(e) => pick(e.touches[0].clientX)}
        onTouchMove={(e) => pick(e.touches[0].clientX)}
        onTouchEnd={() => setSel(null)}
      >
        <defs>
          <linearGradient id={`grad-${rgb}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgba(${rgb},0.32)`} />
            <stop offset="1" stopColor={`rgba(${rgb},0)`} />
          </linearGradient>
        </defs>
        <path d={geo.area} fill={`url(#grad-${rgb})`} />
        <path d={geo.line} fill="none" stroke={color} strokeWidth={narrow ? 2.5 : 3} strokeLinecap="round" strokeLinejoin="round" />
        {/* línea guía del punto seleccionado */}
        {sel !== null && (
          <line x1={geo.pts[sel].cx} y1={10} x2={geo.pts[sel].cx} y2={h - botPad} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        )}
        {geo.pts.map((pt, i) => {
          // En móvil con muchos registros, solo se dibujan algunos puntos.
          const stepHide = narrow && geo.pts.length > 14 && i % 2 === 1 && i !== geo.pts.length - 1
          if (stepHide && sel !== i) return null
          return (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={sel === i ? (narrow ? 6 : 6.5) : narrow ? 3.5 : 4.5}
              fill={sel === i ? color : colors.bg}
              stroke={color}
              strokeWidth={2.5}
            />
          )
        })}
        {axisLabels.map((a) => (
          <text
            key={`t${a.i}`}
            x={a.anchor === 'start' ? 2 : a.anchor === 'end' ? w - 2 : geo.pts[a.i].cx}
            y={h - 6}
            fill={mut(0.4)}
            fontSize={narrow ? 11 : 13}
            textAnchor={a.anchor}
            fontFamily="Montserrat"
          >
            {a.text}
          </text>
        ))}
      </svg>

      {sel !== null && (
        <div
          style={{
            position: 'absolute',
            left: tipLeft,
            top: Math.max(2, geo.pts[sel].cy - 10),
            transform: 'translate(-50%, -100%)',
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
            {points[sel].value}
            {unit && <span style={{ fontSize: 10, fontWeight: 500, color: mut(0.5) }}> {unit}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: mut(0.5), marginTop: 1 }}>{fullDate(points[sel].date)}</div>
        </div>
      )}

      {/* en móvil se avisa de que se puede tocar la gráfica */}
      {narrow && sel === null && (
        <div style={{ fontSize: 10, color: mut(0.3), textAlign: 'center', marginTop: 2 }}>Toca la gráfica para ver cada dato</div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
