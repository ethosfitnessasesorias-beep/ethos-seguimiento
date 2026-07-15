import type { PerimeterLog, Profile, WeightLog } from './db'
import { PERIMETER_FIELDS } from './db'
import type { AdherenceStats } from './events'
import { compositionSeries } from './composition'
import type { ComparePair } from '../components/ProgressPhotos'

// Genera un informe imprimible del cliente y abre el diálogo de impresión
// del navegador, desde donde se puede "Guardar como PDF".
export function generateClientReport(
  profile: Profile,
  weights: WeightLog[],
  perims: PerimeterLog[],
  stats: AdherenceStats | null,
  compare?: ComparePair | null,
) {
  const esc = (s: unknown) => String(s ?? '—').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const today = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())

  const first = weights.length ? Number(weights[0].weight) : null
  const current = weights.length ? Number(weights[weights.length - 1].weight) : profile.current_weight
  const target = profile.target_weight
  const progress = first != null && current != null ? +(current - first).toFixed(1) : null

  const comp = compositionSeries(profile.sex, profile.height_cm, weights, perims)
  const lastComp = comp[comp.length - 1] ?? null
  const lastPerim = perims[perims.length - 1] ?? null

  const row = (k: string, v: string) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`

  const perimRows = lastPerim
    ? PERIMETER_FIELDS.map((f) => row(f.label, lastPerim[f.key] != null ? `${lastPerim[f.key]} cm` : '—')).join('')
    : `<tr><td colspan="2" class="muted">Sin perímetros registrados.</td></tr>`

  const compRows = lastComp
    ? row('Grasa corporal', `${lastComp.fatPct}% (${lastComp.fatKg} kg)`) +
      row('Masa muscular', `${lastComp.musclePct}% (${lastComp.muscleKg} kg)`) +
      row('Masa ósea', `${lastComp.bonePct}% (${lastComp.boneKg} kg)`)
    : `<tr><td colspan="2" class="muted">Sin datos suficientes para estimar la composición.</td></tr>`

  const weightHistory = [...weights]
    .reverse()
    .slice(0, 16)
    .map((w) => `<tr><td>${esc(w.log_date)}</td><td class="r">${Number(w.weight)} kg</td></tr>`)
    .join('')

  // Comparativa de fotos antes / después (si se han seleccionado 2 fotos).
  const pane = (label: string, ph: { url: string | null; date: string; weight: number | null }) =>
    `<div class="pane"><div class="plabel">${esc(label)}</div>` +
    (ph.url ? `<img class="photo" src="${esc(ph.url)}" />` : `<div class="photo empty">Sin foto</div>`) +
    `<div class="pmeta">${esc(ph.date)}${ph.weight != null ? ' · ' + esc(ph.weight) + ' kg' : ''}</div></div>`
  const compareBlock =
    compare && compare.before.url && compare.after.url
      ? `<div class="card compare"><h2>Comparativa de progreso</h2><div class="panes">${pane('Antes', compare.before)}${pane('Después', compare.after)}</div></div>`
      : ''

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe · ${esc(profile.full_name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 32px 36px; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #db1809; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { font-size: 12px; letter-spacing: 3px; color: #db1809; font-weight: 700; }
  .brand b { display: block; font-size: 22px; letter-spacing: 0; color: #111; margin-top: 2px; }
  .date { font-size: 12px; color: #666; text-align: right; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .card { border: 1px solid #e3e3e3; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; break-inside: avoid; }
  .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #db1809; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 5px 0; border-bottom: 1px solid #eee; }
  td.k { color: #555; } td.v { text-align: right; font-weight: 600; }
  td.r { text-align: right; font-weight: 600; }
  .muted { color: #999; }
  .kpis { display: flex; gap: 10px; margin-bottom: 16px; }
  .kpi { flex: 1; border: 1px solid #e3e3e3; border-radius: 10px; padding: 12px; text-align: center; }
  .kpi .n { font-size: 22px; font-weight: 700; }
  .kpi .l { font-size: 11px; color: #666; margin-top: 2px; }
  .foot { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  .compare .panes { display: flex; gap: 16px; }
  .pane { flex: 1; text-align: center; }
  .plabel { font-size: 11px; letter-spacing: 1px; color: #666; font-weight: 700; margin-bottom: 6px; }
  .photo { width: 100%; max-height: 340px; object-fit: cover; border-radius: 8px; border: 1px solid #e3e3e3; }
  .photo.empty { display: flex; align-items: center; justify-content: center; height: 240px; color: #aaa; font-size: 12px; }
  .pmeta { font-size: 12px; color: #333; font-weight: 600; margin-top: 6px; }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style></head><body>
  <div class="head">
    <div class="brand">ETHOS GYM<b>Informe de seguimiento</b></div>
    <div class="date">${esc(today)}</div>
  </div>
  <h1>${esc(profile.full_name || 'Cliente')}</h1>
  <div class="sub">${esc(profile.plan ? 'Plan ' + profile.plan : 'Sin plan')} · ${esc(profile.email || '')}</div>

  <div class="kpis">
    <div class="kpi"><div class="n">${current != null ? esc(current) : '—'}</div><div class="l">Peso actual (kg)</div></div>
    <div class="kpi"><div class="n">${target != null ? esc(target) : '—'}</div><div class="l">Objetivo (kg)</div></div>
    <div class="kpi"><div class="n">${progress != null ? (progress > 0 ? '+' : '') + progress : '—'}</div><div class="l">Progreso (kg)</div></div>
    <div class="kpi"><div class="n">${stats?.planPct ?? 0}%</div><div class="l">Adherencia plan</div></div>
  </div>

  <div class="grid">
    <div>
      <div class="card"><h2>Datos</h2><table>
        ${row('Edad', profile.age != null ? profile.age + ' años' : '—')}
        ${row('Altura', profile.height_cm != null ? profile.height_cm + ' cm' : '—')}
        ${row('Sexo', profile.sex === 'male' ? 'Hombre' : profile.sex === 'female' ? 'Mujer' : '—')}
        ${row('Peso inicial', first != null ? first + ' kg' : '—')}
        ${row('Cumplimiento semana', (stats?.weekPct ?? 0) + '%')}
      </table></div>
      <div class="card"><h2>Perímetros (último)</h2><table>${perimRows}</table></div>
      <div class="card"><h2>Composición corporal (estimada)</h2><table>${compRows}</table></div>
    </div>
    <div>
      <div class="card"><h2>Objetivo principal</h2><div style="font-size:13px;line-height:1.6;color:#333">${esc(profile.main_goal || 'Sin datos')}</div></div>
      <div class="card"><h2>Historial de peso</h2><table>${weightHistory || '<tr><td colspan="2" class="muted">Sin registros.</td></tr>'}</table></div>
    </div>
  </div>

  ${compareBlock}

  <div class="foot">Informe generado automáticamente por ETHOS GYM · Seguimiento. Datos aportados por el cliente a través de la app.</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 700); };</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('Permite las ventanas emergentes para descargar el informe.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
