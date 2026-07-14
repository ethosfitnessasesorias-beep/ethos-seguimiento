// Line/area chart geometry — ported verbatim from the ETHOS design prototype.
// Builds an SVG line path, a filled area path, and per-point coordinates.

export interface SeriesPoint {
  v: number
  m?: string
}

export interface ChartPoint {
  cx: number
  cy: number
  v: number
  label: string
}

export interface Chart {
  line: string
  area: string
  pts: ChartPoint[]
}

export function chart(
  series: SeriesPoint[],
  w: number,
  h: number,
  top: number,
  bot: number,
): Chart {
  const padX = 10
  const vals = series.map((p) => p.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const lo = min - span * 0.4
  const hi = max + span * 0.4
  const X = (i: number) => +(padX + (i * (w - 2 * padX)) / (series.length - 1)).toFixed(1)
  const Y = (v: number) => +(top + (1 - (v - lo) / (hi - lo)) * (h - top - bot)).toFixed(1)
  const pts: ChartPoint[] = series.map((p, i) => ({
    cx: X(i),
    cy: Y(p.v),
    v: p.v,
    label: p.m ?? '',
  }))
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p.cx + ' ' + p.cy).join(' ')
  const area =
    'M' +
    pts[0].cx +
    ' ' +
    (h - bot) +
    ' ' +
    pts.map((p) => 'L' + p.cx + ' ' + p.cy).join(' ') +
    ' L' +
    pts[pts.length - 1].cx +
    ' ' +
    (h - bot) +
    ' Z'
  return { line, area, pts }
}
