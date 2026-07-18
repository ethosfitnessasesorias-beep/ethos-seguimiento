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

// Lunes (YYYY-MM-DD) de la semana de una fecha ISO.
function mondayOfISO(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const off = (dt.getDay() + 6) % 7 // 0 = lunes
  dt.setDate(dt.getDate() - off)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export interface WeeklyChange {
  weekStart: string // lunes de la semana
  weight: number // peso representativo (último de la semana)
  deltaKg: number | null // diferencia con la semana anterior
  deltaPct: number | null
}

/** Cambio de peso semana a semana (velocidad de cambio). */
export function weeklyWeightChanges(weights: WeightLog[]): WeeklyChange[] {
  if (weights.length === 0) return []
  const sorted = [...weights].sort((a, b) => (a.log_date < b.log_date ? -1 : 1))
  // Último peso de cada semana (el más representativo del cierre de semana).
  const byWeek = new Map<string, number>()
  for (const w of sorted) byWeek.set(mondayOfISO(w.log_date), Number(w.weight))
  const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return weeks.map(([weekStart, weight], i) => {
    const prev = i > 0 ? weeks[i - 1][1] : null
    const deltaKg = prev != null ? +(weight - prev).toFixed(1) : null
    const deltaPct = prev != null && prev !== 0 ? +(((weight - prev) / prev) * 100).toFixed(1) : null
    return { weekStart, weight, deltaKg, deltaPct }
  })
}

export interface SeriesPointDated {
  date: string
  value: number
  label: string
}

export function weightSeries(weights: WeightLog[]): SeriesPointDated[] {
  return weights.map((w) => ({ date: w.log_date, value: Number(w.weight), label: shortDate(w.log_date) }))
}

export function perimeterSeries(logs: PerimeterLog[], field: string): SeriesPointDated[] {
  return logs
    .filter((l) => (l[field as keyof PerimeterLog] as number | null) != null)
    .map((l) => ({ date: l.log_date, value: Number(l[field as keyof PerimeterLog]), label: shortDate(l.log_date) }))
}

/** Métricas seleccionables para las gráficas (peso + perímetros). */
export const METRIC_OPTIONS: { key: string; label: string; unit: string; color: string }[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', color: '#db1809' },
  { key: 'cintura', label: 'Cintura', unit: 'cm', color: '#f5a623' },
  { key: 'cadera', label: 'Cadera', unit: 'cm', color: '#2dd4bf' },
  { key: 'pecho', label: 'Pecho', unit: 'cm', color: '#a78bfa' },
  { key: 'brazo', label: 'Brazo', unit: 'cm', color: '#4ade80' },
  { key: 'pierna', label: 'Pierna', unit: 'cm', color: '#f5a623' },
  { key: 'cuello', label: 'Cuello', unit: 'cm', color: '#2dd4bf' },
]

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
