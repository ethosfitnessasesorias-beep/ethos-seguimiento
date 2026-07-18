import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import { addHabitOccurrences, deleteEvent, EVENT_ORDER, EVENT_TYPES, isoAddDays, listEvents, setEventCompleted, setEventNote, type CalEvent, type EventType, type MetricAction } from '../../lib/events'
import Modal from '../Modal'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
  clientId: string
  onOpenForm: (formType: 'reporte' | 'cambio') => void
  onOpenMetric: (action: MetricAction) => void
  onAdherenceChange?: () => void
}

export default function Agenda({ clientId, onOpenForm, onOpenMetric, onAdherenceChange }: Props) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selDay, setSelDay] = useState(now.getDate())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [habitOpen, setHabitOpen] = useState(false)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7 // 0 = Lunes
  const todayISO = iso(now.getFullYear(), now.getMonth(), now.getDate())

  const load = useCallback(async () => {
    const from = iso(year, month, 1)
    const to = iso(year, month, daysInMonth)
    try {
      setEvents(await listEvents(clientId, from, to))
    } catch {
      setEvents([])
    }
  }, [clientId, year, month, daysInMonth])

  useEffect(() => {
    load()
  }, [load])

  const byDay = useMemo(() => {
    const m: Record<number, CalEvent[]> = {}
    for (const e of events) {
      const d = Number(e.event_date.split('-')[2])
      ;(m[d] ||= []).push(e)
    }
    return m
  }, [events])

  const prev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((mo) => mo - 1)
    setSelDay(1)
  }
  const next = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((mo) => mo + 1)
    setSelDay(1)
  }
  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelDay(now.getDate())
  }

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startDow + 1
    const inM = day >= 1 && day <= daysInMonth
    const dayEvents = inM ? byDay[day] || [] : []
    const isToday = inM && iso(year, month, day) === todayISO
    const sel = inM && day === selDay
    return { i, day, inM, dayEvents, isToday, sel }
  })

  const selEvents = byDay[selDay] || []

  const patchEvent = (id: string, patch: Partial<CalEvent>) =>
    setEvents((evs) => evs.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const toggleDone = async (e: CalEvent) => {
    const v = !e.completed
    patchEvent(e.id, { completed: v })
    try {
      await setEventCompleted(e.id, clientId, v)
      onAdherenceChange?.()
    } catch {
      patchEvent(e.id, { completed: !v })
    }
  }
  const saveNote = async (e: CalEvent, text: string) => {
    patchEvent(e.id, { note: text || null })
    try {
      await setEventNote(e.id, text)
    } catch {
      // se mantiene el valor local
    }
  }
  const removeHabit = async (e: CalEvent) => {
    if (!confirm('¿Eliminar este hábito?')) return
    setEvents((evs) => evs.filter((x) => x.id !== e.id))
    try {
      await deleteEvent(e.id)
    } catch {
      load()
    }
  }

  const selectedISO = iso(year, month, selDay)

  return (
    <div>
      {/* month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn onClick={prev}>‹</NavBtn>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{MONTHS[month]} {year}</div>
          <NavBtn onClick={next}>›</NavBtn>
        </div>
        <button onClick={goToday} style={{ fontSize: 12, fontWeight: 600, background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '7px 13px', cursor: 'pointer' }}>
          Hoy
        </button>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {EVENT_ORDER.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: mut(0.65) }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: EVENT_TYPES[k].color }} />
            {EVENT_TYPES[k].label}
          </span>
        ))}
      </div>

      {/* grid */}
      <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {weekdays.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: mut(0.35) }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((c) => (
            <button
              key={c.i}
              onClick={() => c.inM && setSelDay(c.day)}
              style={{
                aspectRatio: '1 / 1.15',
                background: c.sel ? 'rgba(219,24,9,0.16)' : 'transparent',
                border: c.sel ? `1px solid ${colors.accent}` : c.isToday ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                borderRadius: 9,
                cursor: c.inM ? 'pointer' : 'default',
                padding: '4px 0 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 600, color: c.inM ? (c.sel ? colors.text : mut(0.82)) : 'transparent' }}>
                {c.inM ? c.day : ''}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                {c.dayEvents.slice(0, 3).map((e, k) => (
                  <span key={k} style={{ width: 5, height: 5, borderRadius: '50%', background: EVENT_TYPES[e.type as EventType]?.color ?? '#888' }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* day agenda */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 4px 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Agenda · {selDay} de {MONTHS[month].toLowerCase()}</div>
        <button
          onClick={() => setHabitOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.12)', color: colors.green, border: '1px solid rgba(74,222,128,0.35)', borderRadius: 999, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + Hábito
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {selEvents.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: mut(0.35), padding: 22, background: colors.surface1, borderRadius: 12 }}>
            Sin eventos este día
          </div>
        )}
        {selEvents.map((e) => {
          const cfg = EVENT_TYPES[e.type as EventType]
          return (
            <div key={e.id} style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${cfg.color}`, borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* checkbox hecho */}
                <button
                  onClick={() => toggleDone(e)}
                  title={e.completed ? 'Hecho' : 'Marcar como hecho'}
                  style={{ marginTop: 1, width: 22, height: 22, flex: 'none', borderRadius: 7, border: `1.5px solid ${e.completed ? colors.green : 'rgba(255,255,255,0.25)'}`, background: e.completed ? colors.green : 'transparent', color: '#062', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, padding: 0 }}
                >
                  {e.completed ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: e.completed ? 'line-through' : 'none', color: e.completed ? mut(0.5) : colors.text }}>{e.title || cfg.label}</div>
                  {e.title && <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 1 }}>{cfg.label}</div>}
                  {e.detail && <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{e.detail}</div>}
                  {cfg.form && (
                    <button
                      onClick={() => onOpenForm(cfg.form!)}
                      style={{ marginTop: 8, background: cfg.color, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Rellenar ahora ›
                    </button>
                  )}
                  {cfg.metric && (
                    <button
                      onClick={() => onOpenMetric(cfg.metric!)}
                      style={{ marginTop: 8, background: cfg.color, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Registrar ahora ›
                    </button>
                  )}
                </div>
                {e.time && <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{e.time}</span>}
                {e.type === 'habito' && (
                  <button onClick={() => removeHabit(e)} title="Eliminar hábito" style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <input
                defaultValue={e.note ?? ''}
                onBlur={(ev) => saveNote(e, ev.target.value)}
                placeholder="Añadir una nota…"
                style={{ width: '100%', marginTop: 10, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
              />
            </div>
          )
        })}
      </div>

      {habitOpen && (
        <HabitModal
          clientId={clientId}
          date={selectedISO}
          onClose={() => setHabitOpen(false)}
          onDone={() => {
            setHabitOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// Modal para que el cliente añada un hábito (opcionalmente repetido).
const HABIT_SUGGESTIONS = ['Beber 2L de agua', '10.000 pasos', 'Dormir 8 horas', 'Estiramientos', 'Sin ultraprocesados']
type Repeat = 'once' | 'week' | 'month'

function HabitModal({ clientId, date, onClose, onDone }: { clientId: string; date: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [repeat, setRepeat] = useState<Repeat>('week')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    if (!title.trim()) return setErr('Escribe el hábito.')
    setBusy(true)
    setErr(null)
    const days = repeat === 'once' ? 1 : repeat === 'week' ? 7 : 28
    const dates = Array.from({ length: days }, (_, i) => isoAddDays(date, i))
    try {
      await addHabitOccurrences(clientId, dates, { title: title.trim(), time: time.trim() || undefined })
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(false)
    }
  }

  const fld: React.CSSProperties = { width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }

  return (
    <Modal title={`Nuevo hábito · desde ${date}`} onClose={onClose}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {HABIT_SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => setTitle(s)} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 11px', fontFamily: 'inherit', fontSize: 11.5, color: mut(0.7), cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={lbl}>Hábito</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Beber 2L de agua" style={fld} autoFocus />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={lbl}>Hora (opcional)</span>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="08:00" style={fld} />
      </label>
      <div style={lbl}>REPETIR</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {([['once', 'Solo este día'], ['week', 'Una semana'], ['month', '4 semanas']] as [Repeat, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setRepeat(k)} style={{ flex: 1, background: repeat === k ? 'rgba(74,222,128,0.14)' : colors.surface2, color: repeat === k ? colors.green : mut(0.6), border: `1px solid ${repeat === k ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 0', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.green, color: '#062', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Añadir hábito'}
      </button>
    </Modal>
  )
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 9, background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
      {children}
    </button>
  )
}
