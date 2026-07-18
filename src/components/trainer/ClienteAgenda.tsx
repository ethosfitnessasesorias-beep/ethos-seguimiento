import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addEvent,
  deleteEvent,
  deleteProgram,
  deleteTemplate,
  EVENT_ORDER,
  EVENT_TYPES,
  generateProgram,
  listEvents,
  listTemplates,
  saveTemplate,
  todayStr,
  weekdayOfISO,
  type CalEvent,
  type EventType,
  type ProgramTemplate,
  type WeekPattern,
} from '../../lib/events'
import {
  createMessage,
  createSchedule,
  DAY_NAMES,
  deleteMessage,
  deleteSchedule,
  describeSchedule,
  listOneOffMessages,
  listSchedules,
  MESSAGE_TEMPLATES,
  sendNow,
  type Message,
  type MessageSchedule,
} from '../../lib/messages'
import { addReminder, deleteReminder, listReminders, type AgendaReminder } from '../../lib/reminders'
import Modal from '../Modal'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const WEEK_HEAD = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const off = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - off)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default function ClienteAgenda({ clientId }: { clientId: string }) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [programOpen, setProgramOpen] = useState(false)
  const [editProgram, setEditProgram] = useState<ProgramGroup | null>(null)
  const [addDate, setAddDate] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7
  const today = todayStr()

  const reload = useCallback(async () => {
    try {
      setEvents(await listEvents(clientId, `${year - 1}-01-01`, `${year + 1}-12-31`))
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [clientId, year])

  useEffect(() => {
    reload()
  }, [reload])

  const monthEvents = useMemo(
    () =>
      events.filter((e) => {
        const [y, m] = e.event_date.split('-').map(Number)
        return y === year && m === month + 1
      }),
    [events, year, month],
  )
  const byDay = useMemo(() => {
    const m: Record<number, CalEvent[]> = {}
    for (const e of monthEvents) {
      const d = Number(e.event_date.split('-')[2])
      ;(m[d] ||= []).push(e)
    }
    return m
  }, [monthEvents])

  const done = monthEvents.filter((e) => e.completed).length
  const pending = monthEvents.length - done

  const prev = () => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((mo) => mo - 1))
  const next = () => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((mo) => mo + 1))

  const removeEvent = async (e: CalEvent) => {
    if (!confirm(`¿Eliminar «${e.title || EVENT_TYPES[e.type]?.label}» del ${e.event_date}?`)) return
    await deleteEvent(e.id)
    reload()
  }

  const { programs } = useMemo(() => groupEvents(events), [events])

  const removeProgram = async (id: string) => {
    if (!confirm('¿Eliminar el programa completo y todos sus eventos?')) return
    await deleteProgram(id)
    reload()
  }

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startDow + 1
    const inM = day >= 1 && day <= daysInMonth
    return { i, day, inM, date: inM ? iso(year, month, day) : '', evs: inM ? byDay[day] || [] : [] }
  })

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn onClick={prev}>‹</NavBtn>
          <div style={{ fontSize: 17, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>{MONTHS[month]} {year}</div>
          <NavBtn onClick={next}>›</NavBtn>
          <button
            onClick={() => {
              setYear(now.getFullYear())
              setMonth(now.getMonth())
            }}
            style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '7px 13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Hoy
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12.5, color: colors.green, fontWeight: 600 }}>✓ {done} completadas</span>
          <span style={{ fontSize: 12.5, color: colors.amber, fontWeight: 600 }}>⚠ {pending} sin completar</span>
          <button onClick={() => setProgramOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Programar semana
          </button>
        </div>
      </div>

      {/* leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        {EVENT_ORDER.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: mut(0.6) }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: EVENT_TYPES[k].color }} />
            {EVENT_TYPES[k].label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: mut(0.35), marginLeft: 'auto' }}>Pulsa un día para añadir un evento · pulsa un evento para eliminarlo</span>
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, color: colors.green, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {msg}
        </div>
      )}

      {/* calendario mensual */}
      <div style={{ ...card, padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {WEEK_HEAD.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: mut(0.4) }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((c) => (
            <div
              key={c.i}
              onClick={() => c.inM && setAddDate(c.date)}
              style={{
                minHeight: 96,
                background: c.inM ? (c.date === today ? 'rgba(219,24,9,0.06)' : '#0e0e0e') : 'transparent',
                border: c.date === today ? '1px solid rgba(219,24,9,0.45)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding: '5px 5px 6px',
                cursor: c.inM ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: c.inM ? mut(0.6) : 'transparent', paddingLeft: 2 }}>
                {c.inM ? c.day : ''}
              </span>
              {c.evs.slice(0, 4).map((e) => {
                const cfg = EVENT_TYPES[e.type as EventType]
                return (
                  <div
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      removeEvent(e)
                    }}
                    title={`${e.title || cfg?.label}${e.completed ? ' · hecho' : ''}${e.note ? `\nNota: ${e.note}` : ''}`}
                    style={{
                      background: hexA(cfg?.color ?? '#888888', 0.16),
                      borderLeft: `3px solid ${cfg?.color ?? '#888'}`,
                      borderRadius: 4,
                      padding: '2.5px 5px',
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: e.completed ? mut(0.45) : colors.text,
                      textDecoration: e.completed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.completed ? '✓ ' : ''}
                    {e.title || cfg?.label}
                  </div>
                )
              })}
              {c.evs.length > 4 && (
                <span style={{ fontSize: 9, color: mut(0.4), paddingLeft: 2 }}>+{c.evs.length - 4} más</span>
              )}
            </div>
          ))}
        </div>
        {loading && <div style={{ fontSize: 12, color: mut(0.4), padding: '10px 4px 2px' }}>Cargando…</div>}
      </div>

      {/* programas */}
      <div style={{ margin: '22px 0 10px', fontSize: 15, fontWeight: 700 }}>Programas de este cliente</div>
      {programs.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.1)', padding: 18, fontSize: 12.5, color: mut(0.4), textAlign: 'center' }}>
          Sin programas. Crea uno con «Programar semana».
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {programs.map((p) => (
            <ProgramCard key={p.id} p={p} onDelete={() => removeProgram(p.id)} onEdit={() => setEditProgram(p)} />
          ))}
        </div>
      )}

      <RemindersSection clientId={clientId} />

      <MessagesSection clientId={clientId} />

      {programOpen && (
        <ProgramModal
          clientId={clientId}
          onClose={() => setProgramOpen(false)}
          onDone={(n) => {
            setProgramOpen(false)
            setMsg(`Programa creado: ${n} eventos.`)
            reload()
          }}
        />
      )}

      {editProgram && (
        <ProgramModal
          clientId={clientId}
          initial={programToInitial(editProgram)}
          onClose={() => setEditProgram(null)}
          onDone={(n) => {
            setEditProgram(null)
            setMsg(`Programa actualizado: ${n} eventos.`)
            reload()
          }}
        />
      )}

      {addDate && (
        <AddEventModal
          clientId={clientId}
          date={addDate}
          onClose={() => setAddDate(null)}
          onDone={() => {
            setAddDate(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 9, background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
      {children}
    </button>
  )
}

// ---------- Agrupación de programas ----------
interface ProgramGroup {
  id: string
  name: string
  events: CalEvent[]
  from: string
  to: string
  weeks: number
}

// Valores para reabrir un programa en el editor.
interface ProgramInitial {
  id: string
  name: string
  pattern: WeekPattern
  startMonday: string
  endDate: string
}

// Nº de semanas entre dos lunes (inclusive).
function weeksBetween(startMonday: string, endMonday: string): number {
  const a = new Date(startMonday).getTime()
  const b = new Date(endMonday).getTime()
  return Math.round((b - a) / (7 * 86400000)) + 1
}

// Reconstruye el patrón semanal a partir de los eventos de un programa.
function programToInitial(p: ProgramGroup): ProgramInitial {
  const pattern: WeekPattern = {}
  const seen = new Set<string>()
  for (const e of p.events) {
    const wd = weekdayOfISO(e.event_date)
    const key = `${wd}|${e.type}|${e.title ?? ''}|${e.time ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    ;(pattern[wd] ||= []).push({ type: e.type, title: e.title ?? undefined, time: e.time ?? undefined })
  }
  return { id: p.id, name: p.name, pattern, startMonday: mondayOf(p.from), endDate: p.to }
}

function groupEvents(events: CalEvent[]): { programs: ProgramGroup[] } {
  const map = new Map<string, CalEvent[]>()
  for (const e of events) {
    if (!e.program_id) continue
    const arr = map.get(e.program_id) || []
    arr.push(e)
    map.set(e.program_id, arr)
  }
  const programs: ProgramGroup[] = [...map.entries()].map(([id, evs]) => {
    const dates = evs.map((e) => e.event_date).sort()
    const from = dates[0]
    const to = dates[dates.length - 1]
    const weeks = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (7 * 86400000)) + 1
    return { id, name: evs[0].program_name || 'Programa', events: evs, from, to, weeks }
  })
  programs.sort((a, b) => (a.from < b.from ? 1 : -1))
  return { programs }
}

function ProgramCard({ p, onDelete, onEdit }: { p: ProgramGroup; onDelete?: () => void; onEdit?: () => void }) {
  const [open, setOpen] = useState(false)

  const breakdown = useMemo(() => {
    const perDay: Record<number, string[]> = {}
    for (const e of p.events) {
      const wd = weekdayOfISO(e.event_date)
      const label = e.title || EVENT_TYPES[e.type as EventType]?.label || e.type
      perDay[wd] = perDay[wd] || []
      if (!perDay[wd].includes(label)) perDay[wd].push(label)
    }
    return perDay
  }, [p.events])

  return (
    <div style={{ ...card, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
          <span style={{ color: mut(0.4), fontSize: 12, width: 12 }}>{open ? '▾' : '▸'}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{p.name}</div>
            <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>
              {p.events.length} eventos · {p.weeks} semana{p.weeks > 1 ? 's' : ''} · desde {p.from}
            </div>
          </div>
        </button>
        {onEdit && (
          <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '6px 11px', color: colors.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
            Editar
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '6px 11px', color: mut(0.55), cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
            Eliminar
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {DAYS.map((dname, wd) => {
            const items = breakdown[wd]
            if (!items || items.length === 0) return null
            return (
              <div key={wd} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: mut(0.5), width: 74, flex: 'none' }}>{dname}</span>
                <span style={{ fontSize: 13, color: colors.text }}>{items.join(' · ')}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Modal: añadir evento (puntual o repetido) ----------
function AddEventModal({ clientId, date, onClose, onDone }: { clientId: string; date: string; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<EventType>('entreno')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    if (repeat && endDate && endDate < date) return setErr('La fecha de fin debe ser posterior a la del evento.')
    setBusy(true)
    setErr(null)
    try {
      if (!repeat) {
        await addEvent(clientId, { event_date: date, type, title: title.trim() || undefined, time: time.trim() || undefined })
      } else {
        // Repetición semanal: se crea como un mini-programa (agrupado, editable/borrable).
        const wd = weekdayOfISO(date)
        const start = mondayOf(date)
        const FOREVER_WEEKS = 52
        const weeks = endDate ? weeksBetween(start, mondayOf(endDate)) : FOREVER_WEEKS
        const pattern: WeekPattern = { [wd]: [{ type, title: title.trim() || undefined, time: time.trim() || undefined }] }
        await generateProgram(clientId, pattern, start, Math.max(1, weeks), title.trim() || EVENT_TYPES[type].label)
      }
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Añadir evento · ${date}`} onClose={onClose}>
      <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>TIPO</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {EVENT_ORDER.map((t) => {
          const cfg = EVENT_TYPES[t]
          const on = t === type
          return (
            <button key={t} onClick={() => setType(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${on ? cfg.color : 'rgba(255,255,255,0.12)'}`, borderRadius: 999, padding: '7px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: on ? colors.text : mut(0.55), cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
              {cfg.label}
            </button>
          )
        })}
      </div>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre (opcional)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entrenamiento de fuerza" style={fieldStyle} />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Hora (opcional)</span>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="18:30" style={fieldStyle} />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginBottom: repeat ? 10 : 0 }}>
        <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} style={{ width: 17, height: 17, accentColor: colors.accent }} />
        <span style={{ fontSize: 13, color: mut(0.8) }}>Repetir cada semana ({DAYS[weekdayOfISO(date)]})</span>
      </label>
      {repeat && (
        <>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Hasta (opcional)</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date} style={fieldStyle} />
          </label>
          <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 6 }}>
            {endDate ? `Se repetirá cada ${DAYS[weekdayOfISO(date)].toLowerCase()} hasta esa fecha.` : 'Sin fecha de fin: se genera 1 año de repeticiones.'}
          </div>
        </>
      )}

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Creando…' : repeat ? 'Crear eventos' : 'Añadir evento'}
      </button>
    </Modal>
  )
}

// ---------- Modal: programar semana ----------
function ProgramModal({ clientId, onClose, onDone, initial }: { clientId: string; onClose: () => void; onDone: (n: number) => void; initial?: ProgramInitial }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [pattern, setPattern] = useState<WeekPattern>(initial?.pattern ?? {})
  const [startMonday, setStartMonday] = useState(initial?.startMonday ?? mondayOf(todayStr()))
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [saveName, setSaveName] = useState('')

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {})
  }, [])

  const toggle = (day: number, type: EventType) => {
    setPattern((prev) => {
      const list = prev[day] || []
      const exists = list.some((x) => x.type === type)
      const next = exists ? list.filter((x) => x.type !== type) : [...list, { type }]
      return { ...prev, [day]: next }
    })
  }
  const setEntryTitle = (day: number, type: EventType, title: string) => {
    setPattern((prev) => ({ ...prev, [day]: (prev[day] || []).map((x) => (x.type === type ? { ...x, title } : x)) }))
  }
  const has = (day: number, type: EventType) => (pattern[day] || []).some((x) => x.type === type)

  // Sin fecha de fin: se genera un horizonte largo (1 año).
  const FOREVER_WEEKS = 52
  const weeks = endDate ? weeksBetween(startMonday, mondayOf(endDate)) : FOREVER_WEEKS

  const generate = async () => {
    if (!name.trim()) return setErr('Ponle un nombre al programa.')
    if (endDate && endDate < startMonday) return setErr('La fecha de fin debe ser posterior a la de inicio.')
    if (Object.values(pattern).every((l) => !l || l.length === 0)) return setErr('Marca al menos un evento en la semana.')
    setBusy(true)
    setErr(null)
    try {
      // En modo edición, se sustituye el programa: se borran sus eventos y se regeneran.
      if (initial) await deleteProgram(initial.id)
      const n = await generateProgram(clientId, pattern, startMonday, Math.max(1, weeks), name.trim())
      onDone(n)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo generar.')
      setBusy(false)
    }
  }

  const doSave = async () => {
    if (!saveName.trim()) return
    await saveTemplate(saveName.trim(), pattern)
    setSaveName('')
    listTemplates().then(setTemplates).catch(() => {})
  }
  const applyTemplate = (t: ProgramTemplate) => {
    setPattern(t.pattern)
    if (!name.trim()) setName(t.name)
  }
  const removeTemplate = async (t: ProgramTemplate) => {
    await deleteTemplate(t.id)
    setTemplates((s) => s.filter((x) => x.id !== t.id))
  }

  return (
    <Modal title={initial ? 'Editar programa' : 'Programar semana'} onClose={onClose}>
      {initial && (
        <div style={{ fontSize: 11.5, color: colors.amber, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, padding: '9px 11px', marginBottom: 12 }}>
          Al guardar se regenera el programa. Si el cliente ya había marcado eventos como hechos en él, esas marcas se reiniciarán.
        </div>
      )}
      <div style={{ maxHeight: '64vh', overflowY: 'auto', paddingRight: 4 }} className="om-scroll">
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>NOMBRE DEL PROGRAMA</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bloque fuerza · Semana tipo" style={fieldStyle} />
        </label>

        {templates.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>PLANTILLAS GUARDADAS (Biblioteca)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {templates.map((t) => (
                <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '5px 6px 5px 11px', fontSize: 12 }}>
                  <button onClick={() => applyTemplate(t)} style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>{t.name}</button>
                  <button onClick={() => removeTemplate(t)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 13 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 8 }}>EVENTOS DE CADA DÍA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map((dname, day) => {
            const active = pattern[day] || []
            return (
              <div key={day} style={{ background: colors.surface2, borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{dname}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EVENT_ORDER.map((type) => {
                    const on = has(day, type)
                    const cfg = EVENT_TYPES[type]
                    return (
                      <button key={type} onClick={() => toggle(day, type)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${on ? cfg.color : 'rgba(255,255,255,0.12)'}`, borderRadius: 999, padding: '5px 10px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: on ? colors.text : mut(0.55), cursor: 'pointer' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
                {active.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {active.map((e) => (
                      <input
                        key={e.type}
                        value={e.title ?? ''}
                        onChange={(ev) => setEntryTitle(day, e.type, ev.target.value)}
                        placeholder={`${EVENT_TYPES[e.type].label}: nombre (opcional, ej: Entrenamiento de fuerza)`}
                        style={{ ...fieldStyle, background: '#0e0e0e', fontSize: 12.5, padding: '9px 11px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <label>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Desde (se ajusta al lunes)</span>
            <input type="date" value={startMonday} onChange={(e) => setStartMonday(mondayOf(e.target.value))} style={fieldStyle} />
          </label>
          <label>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Hasta (opcional)</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startMonday} style={fieldStyle} />
          </label>
        </div>
        <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 6 }}>
          {endDate ? `Se repetirá ${Math.max(1, weeks)} semana(s).` : 'Sin fecha de fin: se genera 1 año de repeticiones.'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Guardar patrón en la Biblioteca…" style={{ ...fieldStyle, flex: 1 }} />
          <button onClick={doSave} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
        </div>
      </div>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={generate} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? (initial ? 'Guardando…' : 'Generando…') : initial ? 'Guardar cambios' : 'Generar programa'}
      </button>
    </Modal>
  )
}

// ---------- Notas privadas de agenda (recordatorios por email) ----------
function RemindersSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<AgendaReminder[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayStr())
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(() => {
    listReminders(clientId).then(setItems).catch(() => {})
  }, [clientId])
  useEffect(() => {
    reload()
  }, [reload])

  const add = async () => {
    if (!body.trim()) return setErr('Escribe la nota.')
    setBusy(true)
    setErr(null)
    try {
      await addReminder(clientId, date, body.trim())
      setBody('')
      setOpen(false)
      reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  const today = todayStr()

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🔒 Notas privadas de agenda</div>
          <div style={{ fontSize: 12, color: mut(0.5), marginTop: 2 }}>Solo tú las ves. Te avisamos por email el día señalado. (Ej: hacer nueva planificación, pedir fotos…)</div>
        </div>
        <button onClick={() => setOpen((o) => !o)} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {open ? 'Cancelar' : '+ Nueva nota'}
        </button>
      </div>

      {open && (
        <div style={{ ...card, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'end' }}>
            <label>
              <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Día del aviso</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
            </label>
            <label>
              <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Nota</span>
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ej: Preparar nueva planificación / pedir fotos de progreso" style={fieldStyle} />
            </label>
          </div>
          {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
          <button onClick={add} disabled={busy} style={{ marginTop: 12, background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.1)', padding: '18px', textAlign: 'center', fontSize: 12.5, color: mut(0.4) }}>
          Sin notas de agenda para este cliente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((r) => {
            const past = r.remind_date < today
            const isToday = r.remind_date === today
            return (
              <div key={r.id} style={{ ...card, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${isToday ? colors.accent : past ? 'rgba(255,255,255,0.15)' : colors.amber}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4, color: past ? mut(0.5) : colors.text }}>{r.body}</div>
                  <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 600, color: isToday ? colors.accent : past ? mut(0.4) : colors.amber }}>
                    {isToday ? '📌 Hoy' : past ? `Pasado · ${r.remind_date}${r.notified_at ? ' · avisado' : ''}` : `Aviso el ${r.remind_date}`}
                  </div>
                </div>
                <button onClick={() => deleteReminder(r.id).then(reload)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Mensajes de motivación ----------
function MessagesSection({ clientId }: { clientId: string }) {
  const [schedules, setSchedules] = useState<MessageSchedule[]>([])
  const [oneOffs, setOneOffs] = useState<Message[]>([])
  const [open, setOpen] = useState(false)

  const reload = useCallback(() => {
    Promise.all([listSchedules(clientId), listOneOffMessages(clientId)])
      .then(([s, m]) => {
        setSchedules(s)
        setOneOffs(m)
      })
      .catch(() => {})
  }, [clientId])
  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Mensajes de motivación</div>
          <div style={{ fontSize: 12, color: mut(0.5), marginTop: 2 }}>Le llegan al cliente como notificación. Usa {'{nombre}'} para personalizar.</div>
        </div>
        <button onClick={() => setOpen(true)} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nuevo mensaje
        </button>
      </div>

      {schedules.length === 0 && oneOffs.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.1)', padding: '20px', textAlign: 'center', fontSize: 12.5, color: mut(0.4) }}>
          Sin mensajes programados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schedules.map((s) => (
            <div key={s.id} style={{ ...card, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${colors.accent}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{s.body}</div>
                <div style={{ fontSize: 10.5, color: colors.accent, marginTop: 3, fontWeight: 600 }}>↻ {describeSchedule(s)}</div>
              </div>
              <button onClick={() => deleteSchedule(s.id).then(reload)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
          ))}
          {oneOffs.map((m) => (
            <div key={m.id} style={{ ...card, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.body}</div>
                <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 3 }}>Puntual · {m.send_date}{m.read ? ' · leído' : ''}</div>
              </div>
              <button onClick={() => deleteMessage(m.id).then(reload)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {open && <NewMessageModal clientId={clientId} onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload() }} />}
    </div>
  )
}

function NewMessageModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'recurrente' | 'puntual'>('recurrente')
  const [body, setBody] = useState('')
  const [time, setTime] = useState('09:00')
  // recurrente
  const [weekday, setWeekday] = useState(0)
  const [interval, setInterval] = useState('1')
  const [endDate, setEndDate] = useState('')
  // puntual
  const [date, setDate] = useState(todayStr())
  const [busy, setBusy] = useState<null | 'now' | 'schedule'>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, kind: 'now' | 'schedule') => {
    if (!body.trim()) return setErr('Escribe el mensaje.')
    setBusy(kind)
    setErr(null)
    try {
      await fn()
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(null)
    }
  }

  const enviarAhora = () => run(() => sendNow(clientId, body.trim()), 'now')
  const programar = () =>
    run(async () => {
      if (mode === 'recurrente') {
        await createSchedule(clientId, body.trim(), weekday, parseInt(interval, 10) || 1, endDate || null, time)
      } else {
        await createMessage(clientId, body.trim(), date, time)
      }
    }, 'schedule')

  return (
    <Modal title="Nuevo mensaje de motivación" onClose={onClose}>
      <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 999, padding: 4, marginBottom: 14 }}>
        {(['recurrente', 'puntual'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? colors.accent : 'transparent', color: mode === m ? '#fff' : mut(0.55), border: 'none', borderRadius: 999, padding: '8px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {m}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>PLANTILLAS RÁPIDAS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {MESSAGE_TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => setBody(t)} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 10px', fontFamily: 'inherit', fontSize: 11, color: mut(0.7), cursor: 'pointer', textAlign: 'left', maxWidth: '100%' }}>
            {t.length > 34 ? t.slice(0, 34) + '…' : t}
          </button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="¡Vamos {nombre}! Esta semana lo damos todo 💪" style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />

      {mode === 'recurrente' ? (
        <>
          <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, margin: '12px 0 6px' }}>DÍA DE LA SEMANA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 12 }}>
            {WEEK_HEAD.map((w, i) => (
              <button key={i} onClick={() => setWeekday(i)} title={DAY_NAMES[i]} style={{ padding: '9px 0', background: weekday === i ? colors.accent : colors.surface2, color: weekday === i ? '#fff' : mut(0.6), border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                {w}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <label>
              <span style={labelSt}>Hora</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle} />
            </label>
            <label>
              <span style={labelSt}>Frecuencia (sem.)</span>
              <input inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} placeholder="1" style={fieldStyle} />
            </label>
            <label>
              <span style={labelSt}>Fin (opcional)</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          <div style={{ fontSize: 10.5, color: mut(0.35), marginTop: 8 }}>Se enviará ese día, a esa hora, cada X semanas. Sin fecha fin, se repite indefinidamente.</div>
          {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
          <button onClick={programar} disabled={!!busy} style={primaryBtn}>
            {busy === 'schedule' ? 'Programando…' : 'Programar mensaje recurrente'}
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <label>
              <span style={labelSt}>Fecha</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
            </label>
            <label>
              <span style={labelSt}>Hora</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={enviarAhora} disabled={!!busy} style={{ ...primaryBtn, marginTop: 0, flex: 1 }}>
              {busy === 'now' ? 'Enviando…' : '⚡ Enviar ahora'}
            </button>
            <button onClick={programar} disabled={!!busy} style={{ ...primaryBtn, marginTop: 0, flex: 1, background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)' }}>
              {busy === 'schedule' ? 'Programando…' : 'Programar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

const labelSt: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }
const primaryBtn: React.CSSProperties = {
  width: '100%',
  marginTop: 16,
  background: colors.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 14,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: colors.surface2,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '11px 12px',
  color: colors.text,
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
}
