import { colors } from '../theme'
import { chart, type Chart } from './chart'
import { PERIMETER_FIELDS, type PerimeterLog, type WeightLog } from './db'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function shortDate(d: string): string {
  // d viene como 'YYYY-MM-DD'
  const [, m, day] = d.split('-')
  return `${Number(day)} ${MONTHS[Number(m) - 1] ?? ''}`.trim()
}

/** Construye datos de gráfica (línea + área + puntos) a partir de pesos reales. */
export function weightChart(weights: WeightLog[], w: number, h: number, top: number, bot: number): Chart | null {
  if (weights.length < 2) return null
  const series = weights.map((x) => ({ v: Number(x.weight), m: shortDate(x.log_date) }))
  return chart(series, w, h, top, bot)
}

export interface PerimeterRow {
  key: string
  name: string
  v: number
  delta: string | null
  dColor: string
  barW: string
}

/** Últimos valores por perímetro y su variación respecto a la medición anterior. */
export function perimeterRows(logs: PerimeterLog[]): PerimeterRow[] {
  if (logs.length === 0) return []
  const last = logs[logs.length - 1]
  const prev = logs.length > 1 ? logs[logs.length - 2] : null

  const rows = PERIMETER_FIELDS.map((f) => {
    const v = last[f.key] as number | null
    const p = prev ? (prev[f.key] as number | null) : null
    let delta: string | null = null
    let d = 0
    if (v != null && p != null) {
      d = +(v - p).toFixed(1)
      delta = (d > 0 ? '+' : '') + d + ' cm'
    }
    const down = d <= 0
    return { key: f.key, name: f.label, v: v ?? NaN, raw: d, delta, dColor: down ? colors.green : colors.amber }
  }).filter((r) => !Number.isNaN(r.v))

  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.raw)))
  return rows.map((r) => ({
    key: r.key,
    name: r.name,
    v: r.v,
    delta: r.delta,
    dColor: r.dColor,
    barW: ((Math.abs(r.raw) / maxAbs) * 100).toFixed(0) + '%',
  }))
}
