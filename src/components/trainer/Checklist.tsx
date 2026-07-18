import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getChecklist, setChecklist, type ChecklistKind } from '../../lib/checklist'
import { whatsappLink } from '../../lib/db'
import { addReminder } from '../../lib/reminders'
import { isoAddDays } from '../../lib/events'
import type { TrainerTab } from './TrainerApp'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

type Flag = 'wa' | 'docs' | 'forms' | 'evol' | 'remind6'
interface Step {
  key: string
  label: string
  sub?: { key: string; label: string }[]
  flag?: Flag
}

const CLIENTE_NUEVO: Step[] = [
  { key: 'pdf', label: 'Pasar PDF de bienvenida por WhatsApp', flag: 'wa' },
  {
    key: 'tareas',
    label: 'Mandarle mensaje de tareas',
    sub: [
      { key: 'tareas.forms', label: 'Formulario de entrenamiento y nutrición' },
      { key: 'tareas.link', label: 'Link para registrarse en la app' },
      { key: 'tareas.movilidad', label: 'Tareas de valoración de movilidad' },
      { key: 'tareas.tecnica', label: 'Aspectos técnicos y ejercicios' },
      { key: 'tareas.nutri', label: 'Registro nutricional en la app' },
      { key: 'tareas.pasos', label: 'Media de pasos semanal' },
      { key: 'tareas.peso', label: 'Peso corporal de 7 días' },
      { key: 'tareas.analitica', label: 'Analítica' },
    ],
  },
  { key: 'grupo', label: 'Meterlo en el grupo de WhatsApp' },
  { key: 'crm', label: 'Añadir al CRM' },
  { key: 'pago', label: 'Apuntar pago en la app de contabilidad' },
  { key: 'regalo', label: 'Comprar y enviar regalo de bienvenida (Amazon)' },
  { key: 'analitica6', label: 'Programar aviso de analítica a 6 meses', flag: 'remind6' },
  {
    key: 'claude',
    label: 'Preparar proyecto de Claude',
    sub: [
      { key: 'claude.nuevo', label: 'Nuevo proyecto' },
      { key: 'claude.prompt', label: 'Pegar prompt maestro' },
      { key: 'claude.plantillas', label: 'Plantillas en contexto' },
      { key: 'claude.forms', label: 'Añadir forms y contexto del paciente (plan nutri/deportivo)' },
    ],
  },
  { key: 'drive', label: 'Crear carpeta en Drive (fotos lifestyle + diario de entreno)' },
  { key: 'docs', label: 'Subir documentos y plani a la app', flag: 'docs' },
  { key: 'mensaje', label: 'Mandar mensaje al cliente', flag: 'wa' },
]

const NUEVA_PLANI: Step[] = [
  { key: 'cambio', label: 'Pedir rellenar el Formulario de Cambio de plani (o ir al resultado)', flag: 'forms' },
  { key: 'contexto', label: 'Adjuntar datos de contexto actual al proyecto de Claude' },
  { key: 'docs', label: 'Subir los documentos a la app', flag: 'docs' },
  { key: 'mensaje', label: 'Mandar mensaje al cliente', flag: 'wa' },
  { key: 'cambio_fisico', label: 'Mostrar el cambio físico y de hábitos logrado', flag: 'evol' },
]

interface Props {
  clientId: string
  clientPhone: string | null
  goTab: (t: TrainerTab) => void
}

export default function Checklist({ clientId, clientPhone, goTab }: Props) {
  const [kind, setKind] = useState<ChecklistKind>('nuevo')
  const steps = kind === 'nuevo' ? CLIENTE_NUEVO : NUEVA_PLANI
  const [done, setDone] = useState<Set<string>>(new Set())
  const [remindMsg, setRemindMsg] = useState<string | null>(null)

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
    if (flag === 'remind6') {
      return (
        <button
          onClick={async () => {
            try {
              await addReminder(clientId, isoAddDays(new Date().toISOString().slice(0, 10), 182), 'Toca analítica del cliente (cada 6 meses).')
              setRemindMsg('Aviso a 6 meses creado ✓ (te llegará por email).')
            } catch {
              setRemindMsg('No se pudo crear el aviso.')
            }
          }}
          style={miniBtn(colors.surface2, colors.text)}
        >
          Programar aviso
        </button>
      )
    }
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['nuevo', 'Cliente nuevo'], ['plani', 'Nueva plani']] as [ChecklistKind, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} style={{ background: kind === k ? colors.accent : colors.surface2, color: kind === k ? '#fff' : mut(0.6), border: kind === k ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 18px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
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

      {remindMsg && <div style={{ fontSize: 12, color: colors.green, marginBottom: 10 }}>{remindMsg}</div>}

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
            <div key={s.key} style={{ ...card, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckRow label={`${i + 1}. ${s.label}`} checked={done.has(s.key)} onToggle={() => toggle(s.key)} />
              <div style={{ marginLeft: 'auto', flex: 'none' }}>{flagButton(s.flag)}</div>
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
