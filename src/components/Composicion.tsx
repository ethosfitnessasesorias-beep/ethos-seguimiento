import { colors, mut } from '../theme'
import { computeComposition } from '../lib/composition'
import type { PerimeterLog } from '../lib/db'

interface Props {
  sex: string | null
  heightCm: number | null
  weight: number | null
  perim: PerimeterLog | null
}

const dash = (v: number | null | undefined) => (v == null ? '—' : String(v))

export default function Composicion({ sex, heightCm, weight, perim }: Props) {
  const res = computeComposition({
    sex,
    heightCm,
    weight,
    waist: perim?.cintura ?? null,
    neck: perim?.cuello ?? null,
    hip: perim?.cadera ?? null,
  })

  if (!res.ok) {
    return (
      <div style={{ fontSize: 12, color: mut(0.45), lineHeight: 1.6 }}>
        Para calcular la composición faltan datos: <b style={{ color: mut(0.7) }}>{res.missing.join(', ')}</b>.
        <div style={{ marginTop: 4, fontSize: 11, color: mut(0.35) }}>
          El entrenador rellena sexo y altura en la ficha; cintura, cuello y cadera se registran en Métricas.
        </div>
      </div>
    )
  }

  const items = [
    { label: 'Masa muscular', pct: res.musclePct, kg: res.muscleKg, color: colors.accent },
    { label: 'Grasa corporal', pct: res.fatPct, kg: res.fatKg, color: colors.amber },
    { label: 'Masa ósea', pct: res.bonePct, kg: res.boneKg, color: '#2dd4bf' },
  ]

  return (
    <div>
      {!res.reliable && (
        <div style={{ fontSize: 11.5, color: '#f5a99f', background: 'rgba(219,24,9,0.1)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, lineHeight: 1.5 }}>
          ⚠ Este cálculo estimado ha dado un valor poco habitual. Revisa dos cosas: <b>1)</b> que las medidas de <b>cintura, cuello y cadera</b> estén bien tomadas (usa la <b>ⓘ</b> al registrar perímetros) y no intercambiadas; <b>2)</b> que los datos que usa la fórmula estén bien apuntados en la ficha, sobre todo la <b>altura en centímetros</b> (p. ej. 168, no 1,68). Comprueba también sexo, cintura, cuello y cadera en la línea «Calculado con» de aquí abajo. Si todo está correcto, puedes ignorarlo: es solo una estimación.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((it) => (
          <div key={it.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: mut(0.7) }}>{it.label}</span>
              <span style={{ fontWeight: 600 }}>
                {it.pct}% <span style={{ color: mut(0.5), fontWeight: 500 }}>· {it.kg} kg</span>
              </span>
            </div>
            <div style={{ height: 9, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, it.pct)}%`, height: '100%', background: it.color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: mut(0.5), marginTop: 12, lineHeight: 1.6, background: colors.surface2, borderRadius: 8, padding: '8px 10px' }}>
        <b style={{ color: mut(0.65) }}>Calculado con:</b> altura {dash(heightCm)} cm · cintura {dash(perim?.cintura)} · cuello {dash(perim?.cuello)}
        {sex === 'female' ? ` · cadera ${dash(perim?.cadera)}` : ''} · peso {dash(weight)} kg.
        {' '}Si algún dato no cuadra con el tuyo, corrígelo en la ficha o en el registro de perímetros.
      </div>
      <div style={{ fontSize: 10.5, color: mut(0.35), marginTop: 8, lineHeight: 1.5 }}>
        Estimación · grasa por método US Navy (peso y perímetros). Músculo y hueso son aproximados; úsalo como referencia de tendencia, no como medición clínica.
      </div>
    </div>
  )
}
