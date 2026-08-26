import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getChecklist, setChecklist, type ChecklistKind } from '../../lib/checklist'
import { whatsappLink } from '../../lib/db'
import type { TrainerTab } from './TrainerApp'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

type Flag = 'wa' | 'docs' | 'forms' | 'evol' | 'agenda'
interface Step {
  key: string
  label: string
  hint?: string
  sub?: { key: string; label: string }[]
  flag?: Flag
}

// Optimizados contra la app: las tareas que la app automatiza ya no aparecen
// (contrato, temporalidades, cumpleaños, reseñas a los 2 meses, analítica cada
// 6 meses, seguimiento de regalos…).
const CLIENTE_NUEVO: Step[] = [
  { key: 'stripe', label: 'Meterlo en Stripe (solo si es pago domiciliado)' },
  { key: 'etiquetas', label: 'Poner etiquetas de WhatsApp' },
  { key: 'fechainicio', label: 'Poner su fecha de inicio en la ficha de la app', hint: 'Editar ficha → Fecha de inicio. Activa regalos, temporalidades, reseñas y analítica automáticas' },
  { key: 'pdf', label: 'Enviar por WhatsApp: PDF de bienvenida (+ PDF grasa si viene por pérdida de grasa)', flag: 'wa' },
  { key: 'video', label: 'Enviar vídeo de bienvenida por WhatsApp', flag: 'wa' },
  { key: 'mensaje', label: 'Mensaje de bienvenida y siguientes pasos por WhatsApp', flag: 'wa' },
  { key: 'grupo', label: 'Meterlo en el grupo de WhatsApp' },
  { key: 'estudio', label: 'Aplicar el programa «Estudio Inicial» en su Agenda', hint: 'Programar semana → plantilla ⭐ Estudio Inicial (peso 7 días, perímetros, fotos, nutrición, pasos y vídeos)', flag: 'agenda' },
  { key: 'programa', label: 'Añadir su programa en la Agenda', hint: 'Programar semana con sus entrenos, cardio y hábitos (o aplicar una plantilla de la Biblioteca)', flag: 'agenda' },
  { key: 'analitica', label: 'Pedir analítica inicial y guardarla en Documentos', hint: 'El aviso de las siguientes es automático cada 6 meses (te llega email)', flag: 'docs' },
  { key: 'forms', label: 'Revisar formularios, explicarle tu idea y fijar objetivos', hint: 'Apunta el plan en Notas privadas', flag: 'forms' },
  { key: 'gustos', label: 'Apuntar en Notas privadas lo que NO le gusta y las máquinas que NO tiene' },
  { key: 'cumple', label: 'Apuntar su cumpleaños en el Calendar', hint: 'La app ya le felicita sola (por la fecha de nacimiento de su ficha); esto es para tenerlo tú presente' },
  { key: 'cobro', label: 'Apuntar cobro en gestión de clientes', hint: 'Editar ficha → importe, cada cuántos meses y próxima fecha. Aparece en Resumen → Próximos cobros' },
  { key: 'pago', label: 'Apuntar el pago en la app de contabilidad' },
  { key: 'regalo', label: 'Comprar y enviar regalo de bienvenida (straps, shaker…)', hint: 'Al marcarlo entregado en 🎁 Regalos, apunta ahí QUÉ le regalaste' },
  { key: 'gasto', label: 'Apuntar gasto del regalo en contabilidad' },
  { key: 'drive', label: 'Crear carpeta en Drive: plantilla Diario de entrenamiento, lifestyle y planis', hint: 'Para que no se borre nada' },
  { key: 'revision', label: '¿Revisión presencial? Si sí, agendarla', flag: 'agenda' },
  { key: 'llamadas', label: 'Poner llamadas / revisiones / entrenos personales en su Agenda', flag: 'agenda' },
  { key: 'docs', label: 'Ordenar carpetas de entregables y subir los entregables', hint: 'Documentos → carpetas «Documentos asesoría», «Planis anteriores» y «Plani actual». Puedes subir varios archivos a la vez; avisa solo al cliente', flag: 'docs' },
  { key: 'proxplani', label: 'Apuntar recordatorio privado de próxima plani (4-6 semanas)', hint: 'Agenda → Notas privadas con aviso. Sale en Resumen → Próximos avisos', flag: 'agenda' },
  { key: 'loom', label: 'Vídeo Loom explicando la plani al entregarla' },
  { key: 'historias', label: 'Pedirle que nos apoye subiendo historias' },
]

const NUEVA_PLANI: Step[] = [
  { key: 'reportes', label: 'Mirar reportes y formulario de cambio de plani en la app', hint: 'Pestaña Formularios · botón ↓ PDF para adjuntar a Claude', flag: 'forms' },
  { key: 'contexto', label: 'Adjuntar datos de contexto actual al proyecto de Claude' },
  { key: 'roadmap', label: 'Road Map y contar series (Excel — si lo usas)' },
  { key: 'canva', label: 'Canva: juntar plani en un solo documento (de plani 2 en adelante)' },
  { key: 'docs', label: 'Subir entregables: la plani nueva a «Plani actual» y mover la anterior a «Planis anteriores»', hint: 'Documentos · puedes subir varios archivos a la vez; avisa solo al cliente', flag: 'docs' },
  { key: 'lista', label: 'Mandar lista de la compra (si tiene nutri) — Documentos', flag: 'docs' },
  { key: 'programa', label: 'Añadir / actualizar su programa en la Agenda', flag: 'agenda' },
  { key: 'proxplani', label: 'Apuntar recordatorio privado de la siguiente plani', hint: 'Agenda → Notas privadas. Sale en Resumen → Próximos avisos', flag: 'agenda' },
  { key: 'evol', label: 'Enseñarle su cambio físico y los hábitos que ha logrado', flag: 'evol' },
  { key: 'mensaje', label: 'Avisarle por WhatsApp de que tiene nueva plani', flag: 'wa' },
]

const SEGUIMIENTO: Step[] = [
  { key: 'fisico', label: 'Valorar cambio físico y plantearte subirlo a redes', hint: 'Cada mes · también te avisa Resumen → Valorar cambio físico', flag: 'evol' },
  { key: 'testimonio', label: 'Pedir testimonio escrito y en vídeo (cuando haya buen cambio)' },
  { key: 'gs', label: 'Revisar ofertas Grand Slam pendientes', hint: '🎯 en la ficha del cliente · trimestral/semestral mes 1-3 · anual mes 3-6 o al final' },
  { key: 'encuesta', label: 'Programar encuesta de satisfacción (al mes 1-3)', flag: 'agenda' },
  { key: 'regalos', label: 'Entregar regalos reclamados y apuntar QUÉ le regalaste', hint: '🎁 en la ficha · al marcar entregado aparece el campo para escribir el regalo' },
  { key: 'resena_hecha', label: 'Confirmar que ha dejado reseña (Trustpilot / Google)', hint: 'IMPORTANTE: márcalo cuando la deje — esto DETIENE los recordatorios automáticos de reseña (3, 6 y 12 meses)' },
  { key: 'analitica', label: 'Revisar analítica cuando llegue el aviso automático y guardarla', flag: 'docs' },
]

const MARCHA: Step[] = [
  { key: 'encuesta', label: 'Programarle la encuesta de salida ANTES de dar la baja', hint: 'Después de la baja ya no puede entrar en la app', flag: 'forms' },
  { key: 'fisico', label: 'Valorar subir su cambio físico final y pedir testimonio', flag: 'evol' },
  { key: 'baja', label: 'Dar de baja en la app', hint: 'Botón «Dar de baja» arriba: conserva su historial y abre WhatsApp con tu mensaje de despedida y reseñas' },
  { key: 'resena', label: 'Recordarle la reseña si aún no la ha dejado', hint: 'El mensaje de despedida ya la pide; verifica que la deja', flag: 'wa' },
  { key: 'stripe', label: 'Quitarlo de Stripe' },
  { key: 'plani_cal', label: 'Quitar la plani activa del Calendar' },
  { key: 'eventos_cal', label: 'Quitar sus eventos del Calendar (premios, cobros, llamadas…)' },
  { key: 'grupo', label: 'Echarlo del grupo de WhatsApp' },
  { key: 'etiquetas', label: 'Quitar etiquetas de WhatsApp' },
  { key: 'contab', label: 'Marcarlo en contabilidad y CRM (formato de baja)' },
  { key: 'drive', label: 'Mover a clientes antiguos en Drive' },
  { key: 'pc', label: 'Quitar carpeta del PC (si queda algo fuera de la app)' },
]

const LISTS: Record<ChecklistKind, Step[]> = {
  nuevo: CLIENTE_NUEVO,
  plani: NUEVA_PLANI,
  seguimiento: SEGUIMIENTO,
  marcha: MARCHA,
}
const KIND_LABELS: [ChecklistKind, string][] = [
  ['nuevo', 'Cliente nuevo'],
  ['plani', 'Nueva plani'],
  ['seguimiento', 'Seguimiento'],
  ['marcha', 'Marcha'],
]

interface Props {
  clientId: string
  clientPhone: string | null
  goTab: (t: TrainerTab) => void
}

export default function Checklist({ clientId, clientPhone, goTab }: Props) {
  const [kind, setKind] = useState<ChecklistKind>('nuevo')
  const steps = LISTS[kind]
  const [done, setDone] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    getChecklist(clientId, kind).then((d) => setDone(new Set(d))).catch(() => setDone(new Set()))
  }, [clientId, kind])
  useEffect(load, [load])

  const persist = (next: Set<string>) => {
    setDone(next)
    setChecklist(clientId, kind, [...next]).catch(() => {})
  }
  const toggle = (key: string) => {
    const next = new Set(done)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    persist(next)
  }

  // Hojas: pasos sin sub + todos los sub.
  const leaves: string[] = steps.flatMap((s) => (s.sub ? s.sub.map((x) => x.key) : [s.key]))
  const completed = leaves.filter((k) => done.has(k)).length
  const pct = leaves.length ? Math.round((completed / leaves.length) * 100) : 0

  const flagButton = (flag?: Flag) => {
    if (!flag) return null
    if (flag === 'wa') {
      const link = whatsappLink(clientPhone)
      if (!link) return null
      return <a href={link} target="_blank" rel="noreferrer" style={miniBtn('#25D366', '#04310f')}>WhatsApp</a>
    }
    if (flag === 'docs') return <button onClick={() => goTab('documentos')} style={miniBtn(colors.surface2, colors.text)}>Ir a Documentos</button>
    if (flag === 'forms') return <button onClick={() => goTab('formularios')} style={miniBtn(colors.surface2, colors.text)}>Ver formularios</button>
    if (flag === 'evol') return <button onClick={() => goTab('evolucion')} style={miniBtn(colors.surface2, colors.text)}>Ver evolución</button>
    if (flag === 'agenda') return <button onClick={() => goTab('agenda')} style={miniBtn(colors.surface2, colors.text)}>Ir a Agenda</button>
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {KIND_LABELS.map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} style={{ background: kind === k ? colors.accent : colors.surface2, color: kind === k ? '#fff' : mut(0.6), border: kind === k ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 18px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: mut(0.45), margin: '0 2px 14px', lineHeight: 1.5 }}>
        Solo aparecen las tareas manuales: el contrato, las temporalidades, el cumpleaños, la petición de reseñas (2 meses), el aviso de analítica (cada 6 meses) y el control de regalos ya son automáticos.
      </div>

      {/* progreso */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
          <span style={{ color: mut(0.6) }}>Progreso</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? colors.green : colors.accent }}>{completed}/{leaves.length} · {pct}%</span>
        </div>
        <div style={{ height: 8, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? colors.green : colors.accent, borderRadius: 999, transition: 'width .2s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) =>
          s.sub ? (
            <div key={s.key} style={{ ...card, padding: '12px 15px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{i + 1}. {s.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
                {s.sub.map((sub) => (
                  <CheckRow key={sub.key} label={sub.label} checked={done.has(sub.key)} onToggle={() => toggle(sub.key)} small />
                ))}
              </div>
            </div>
          ) : (
            <div key={s.key} style={{ ...card, padding: '12px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckRow label={`${i + 1}. ${s.label}`} checked={done.has(s.key)} onToggle={() => toggle(s.key)} />
                <div style={{ marginLeft: 'auto', flex: 'none' }}>{flagButton(s.flag)}</div>
              </div>
              {s.hint && <div style={{ fontSize: 11, color: mut(0.4), marginTop: 5, paddingLeft: 30, lineHeight: 1.45 }}>{s.hint}</div>}
            </div>
          ),
        )}
      </div>

      <button
        onClick={() => persist(new Set())}
        style={{ marginTop: 16, background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 16px', color: mut(0.5), cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}
      >
        Reiniciar checklist
      </button>
    </div>
  )
}

function CheckRow({ label, checked, onToggle, small }: { label: string; checked: boolean; onToggle: () => void; small?: boolean }) {
  return (
    <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: small ? '6px 0' : 0, textAlign: 'left', flex: 1 }}>
      <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: `1.5px solid ${checked ? colors.green : 'rgba(255,255,255,0.25)'}`, background: checked ? colors.green : 'transparent', color: '#062', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
        {checked ? '✓' : ''}
      </span>
      <span style={{ fontSize: small ? 12.5 : 13.5, fontWeight: small ? 500 : 600, color: checked ? mut(0.5) : colors.text, textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
    </button>
  )
}

function miniBtn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 11px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }
}
