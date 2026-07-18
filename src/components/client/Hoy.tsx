import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  EVENT_TYPES,
  isoAddDays,
  listEvents,
  setEventCompleted,
  todayStr,
  type CalEvent,
  type EventType,
  type FormLink,
  type MetricAction,
} from '../../lib/events'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

interface Props {
  clientId: string
  onOpenForm: (f: FormLink) => void
  onOpenMetric: (m: MetricAction) => void
  onOpenWhatsApp: (msg: string) => void
  onDone?: () => void
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
function prettyToday(): string {
  const [, m, d] = todayStr().split('-')
  return `${Number(d)} de ${MONTHS[Number(m) - 1]}`
}
const isAction = (e: CalEvent) => {
  const c = EVENT_TYPES[e.type as EventType]
  return !!(c?.form || c?.metric || c?.wa)
}

export default function Hoy({ clientId, onOpenForm, onOpenMetric, onOpenWhatsApp, onDone }: Props) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const today = todayStr()

  const load = useCallback(() => {
    listEvents(clientId, isoAddDays(today, -45), today)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true))
  }, [clientId, today])
  useEffect(load, [load])

  const todayEvents = events.filter((e) => e.event_date === today)
  const pending = events.filter((e) => e.event_date < today && !e.completed && isAction(e))

  const markDone = async (e: CalEvent) => {
    setEvents((evs) => evs.map((x) => (x.id === e.id ? { ...x, completed: true } : x)))
    try {
      await setEventCompleted(e.id, clientId, true)
      onDone?.()
    } catch {
      load()
    }
  }
  const act = (e: CalEvent) => {
    const c = EVENT_TYPES[e.type as EventType]
    if (c.form) onOpenForm(c.form)
    else if (c.metric) onOpenMetric(c.metric)
    else if (c.wa) onOpenWhatsApp(c.wa)
  }

  if (!loaded) return null

  const allDone = todayEvents.length > 0 && todayEvents.every((e) => e.completed)

  return (
    <div style={{ ...card, padding: '16px 16px 14px', marginBottom: 18, background: 'linear-gradient(160deg,rgba(96,165,250,0.10),rgba(17,17,17,1) 55%)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Hoy</div>
        <div style={{ fontSize: 11.5, color: mut(0.5) }}>{prettyToday()}</div>
      </div>

      {todayEvents.length === 0 && pending.length === 0 ? (
        <div style={{ fontSize: 12.5, color: mut(0.55) }}>No tienes tareas para hoy. ¡Disfruta! 💪</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todayEvents.length === 0 && <div style={{ fontSize: 12.5, color: mut(0.5) }}>Nada programado para hoy.</div>}
          {allDone && <div style={{ fontSize: 12.5, color: colors.green, fontWeight: 600 }}>¡Todo lo de hoy completado! 🎉</div>}
          {todayEvents.map((e) => (
            <TaskRow key={e.id} e={e} onAct={() => act(e)} onDone={() => markDone(e)} />
          ))}

          {pending.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, letterSpacing: 1, color: colors.amber, fontWeight: 700, marginTop: 8 }}>PENDIENTE DE DÍAS ANTERIORES</div>
              {pending.map((e) => (
                <TaskRow key={e.id} e={e} overdue onAct={() => act(e)} onDone={() => markDone(e)} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ e, overdue, onAct, onDone }: { e: CalEvent; overdue?: boolean; onAct: () => void; onDone: () => void }) {
  const cfg = EVENT_TYPES[e.type as EventType]
  const action = !!(cfg?.form || cfg?.metric || cfg?.wa)
  const label = e.title || cfg?.label || 'Tarea'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: overdue ? 'rgba(245,166,35,0.06)' : colors.surface2, border: `1px solid ${overdue ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 11, padding: '10px 12px' }}>
      <button
        onClick={onDone}
        disabled={e.completed}
        title={e.completed ? 'Hecho' : 'Marcar como hecho'}
        style={{ width: 22, height: 22, flex: 'none', borderRadius: 7, border: `1.5px solid ${e.completed ? colors.green : 'rgba(255,255,255,0.25)'}`, background: e.completed ? colors.green : 'transparent', color: '#062', cursor: e.completed ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, padding: 0 }}
      >
        {e.completed ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: e.completed ? 'line-through' : 'none', color: e.completed ? mut(0.5) : colors.text }}>{label}</div>
        <div style={{ fontSize: 10.5, color: mut(0.45), marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: cfg?.color ?? '#888' }} />
          {cfg?.label}{overdue ? ` · ${e.event_date.slice(5)}` : ''}{e.time ? ` · ${e.time}` : ''}
        </div>
      </div>
      {action && !e.completed && (
        <button onClick={onAct} style={{ flex: 'none', background: cfg.color, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '7px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {cfg.wa ? 'Enviar ›' : cfg.form ? 'Rellenar ›' : 'Registrar ›'}
        </button>
      )}
    </div>
  )
}
