// Estimación de composición corporal a partir de peso y perímetros.
// Grasa: método US Navy (validado). Músculo y hueso: estimaciones.
import type { PerimeterLog, WeightLog } from './db'

export interface CompositionInput {
  sex: string | null // 'male' | 'female'
  heightCm: number | null
  weight: number | null
  waist: number | null // cintura
  neck: number | null // cuello
  hip: number | null // cadera (necesario en mujeres)
}

export interface CompositionResult {
  ok: true
  fatPct: number
  fatKg: number
  musclePct: number
  muscleKg: number
  bonePct: number
  boneKg: number
  leanKg: number
  reliable: boolean // false si el resultado se salió de rango (medidas probablemente mal)
}

export interface CompositionMissing {
  ok: false
  missing: string[]
}

const log10 = (x: number) => Math.log(x) / Math.log(10)
const round1 = (x: number) => Math.round(x * 10) / 10

export function computeComposition(input: CompositionInput): CompositionResult | CompositionMissing {
  const missing: string[] = []
  if (input.sex !== 'male' && input.sex !== 'female') missing.push('sexo')
  if (!input.heightCm) missing.push('altura')
  if (!input.weight) missing.push('peso')
  if (!input.waist) missing.push('cintura')
  if (!input.neck) missing.push('cuello')
  if (input.sex === 'female' && !input.hip) missing.push('cadera')
  if (missing.length) return { ok: false, missing }

  const h = input.heightCm as number
  const weight = input.weight as number
  const waist = input.waist as number
  const neck = input.neck as number
  const hip = input.hip as number

  let raw: number
  if (input.sex === 'male') {
    const denom = 1.0324 - 0.19077 * log10(Math.max(1, waist - neck)) + 0.15456 * log10(h)
    raw = 495 / denom - 450
  } else {
    const denom = 1.29579 - 0.35004 * log10(Math.max(1, waist + hip - neck)) + 0.221 * log10(h)
    raw = 495 / denom - 450
  }
  // Banda plausible. Fuera de ella (valores negativos, disparados o imposibles)
  // casi siempre es un error de medida: cintura/cuello intercambiados o una errata.
  // La fórmula US Navy tiende a dar valores altos en mujeres con cadera ancha,
  // por eso el techo es más alto en mujeres (evita falsos avisos con medidas correctas).
  const hi = input.sex === 'female' ? 55 : 45
  const lo = input.sex === 'female' ? 8 : 4
  const reliable = raw >= lo && raw <= hi
  const fatPct = Math.min(65, Math.max(3, raw))

  const fatKg = (fatPct / 100) * weight
  const leanKg = weight - fatKg
  const muscleKg = 0.5 * leanKg // músculo esquelético estimado (~50% de la masa magra)
  const boneKg = 0.045 * weight // masa ósea estimada (~4,5% del peso)

  return {
    ok: true,
    fatPct: round1(fatPct),
    fatKg: round1(fatKg),
    musclePct: round1((muscleKg / weight) * 100),
    muscleKg: round1(muscleKg),
    bonePct: round1((boneKg / weight) * 100),
    boneKg: round1(boneKg),
    leanKg: round1(leanKg),
    reliable,
  }
}

export interface CompositionPoint extends CompositionResult {
  date: string
}

/**
 * Serie temporal de composición: una entrada por cada registro de perímetros,
 * emparejado con el peso más reciente hasta esa fecha.
 */
export function compositionSeries(
  sex: string | null,
  heightCm: number | null,
  weights: WeightLog[],
  perims: PerimeterLog[],
): CompositionPoint[] {
  const out: CompositionPoint[] = []
  for (const p of perims) {
    let w: number | null = null
    for (const wl of weights) if (wl.log_date <= p.log_date) w = Number(wl.weight)
    if (w == null && weights.length) w = Number(weights[0].weight)
    const c = computeComposition({
      sex,
      heightCm,
      weight: w,
      waist: p.cintura,
      neck: p.cuello,
      hip: p.cadera,
    })
    if (c.ok) out.push({ ...c, date: p.log_date })
  }
  return out
}
