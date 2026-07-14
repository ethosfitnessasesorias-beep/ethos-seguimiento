import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  deleteProgram,
  deleteTemplate,
  EVENT_ORDER,
  EVENT_TYPES,
  generateProgram,
  listEvents,
  listTemplates,
  saveTemplate,
  type CalEvent,
  type EventType,
  type ProgramTemplate,
  type WeekPattern,
} from '../../lib/events'
import { createMessages, deleteMessage, listTrainerMessages, MESSAGE_TEMPLATES, type Message } from '../../lib/messages'
import Modal from '../Modal'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const off = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - off)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

interface ProgramGroup {
  id: string
  name: string
  events: CalEvent[]
  from: string
  to: string
  weeks: number
}

export default function ClienteAgenda({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [programOpen, setProgramOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const range = useMemo(() => {
    const d = new Date()
    return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear() + 1}-12-31` }
  }, [])

  const reload = useCallback(async () => {
    try {
      setEvents(await listEvents(clientId, range.from, range.to))
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [clientId, range])

  useEffect(() => {
    reload()
  }, [reload])

  const { programs, loose } = useMemo(() => groupEvents(events), [events])

  const removeProgram = async (id: string) => {
    if (!confirm('¿Eliminar el programa completo y todos sus eventos?')) return
    await deleteProgram(id)
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: mut(0.5) }}>Programa la semana del cliente; se repite las veces que quieras.</div>
        <button onClick={() => setProgramOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Programar semana
        </button>
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, color: colors.green, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12.5, color: mut(0.4) }}>Cargando…</div>
      ) : programs.length === 0 && loose.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '34px 18px', textAlign: 'center', fontSize: 13, color: mut(0.45) }}>
          Sin programas todavía. Pulsa «Programar semana» para crear el primero.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {programs.map((p) => (
            <ProgramCard key={p.id} p={p} onDelete={() => removeProgram(p.id)} />
          ))}
          {loose.length > 0 && <ProgramCard p={{ id: 'loose', name: 'Otros eventos', events: loose, from: loose[0].event_date, to: loose[loose.length - 1].event_date, weeks: 0 }} />}
        </div>
      )}

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
    </div>
  )
}

// ---------- Mensajes de motivación / notificaciones ----------
function MessagesSection({ clientId }: { clientId: string }) {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [open, setOpen] = useState(false)

  const reload = useCallback(() => {
    listTrainerMessages(clientId).then(setMsgs).catch(() => {})
  }, [clientId])
  useEffect(() => {
    reload()
  }, [reload])

  const remove = async (m: Message) => {
    await deleteMessage(m.id)
    reload()
  }

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

      {msgs.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.1)', padding: '20px', textAlign: 'center', fontSize: 12.5, color: mut(0.4) }}>
          Sin mensajes programados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m) => (
            <div key={m.id} style={{ ...card, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.body}</div>
                <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 3 }}>Se envía el {m.send_date}{m.read ? ' · leído' : ''}</div>
              </div>
              <button onClick={() => remove(m)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {open && <NewMessageModal clientId={clientId} onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload() }} />}
    </div>
  )
}

function NewMessageModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const [body, setBody] = useState('')
  const [start, setStart] = useState(todayISO())
  const [repeat, setRepeat] = useState('1')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const send = async () => {
    if (!body.trim()) return setErr('Escribe el mensaje.')
    const r = parseInt(repeat, 10) || 1
    setBusy(true)
    setErr(null)
    try {
      await createMessages(clientId, body.trim(), start, r)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Nuevo mensaje de motivación" onClose={onClose}>
      <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>PLANTILLAS RÁPIDAS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {MESSAGE_TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => setBody(t)} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 10px', fontFamily: 'inherit', fontSize: 11, color: mut(0.7), cursor: 'pointer', textAlign: 'left', maxWidth: '100%' }}>
            {t.length > 34 ? t.slice(0, 34) + '…' : t}
          </button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="¡Vamos {nombre}! Esta semana lo damos todo 💪" style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <label>
          <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Primer envío</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={fieldStyle} />
        </label>
        <label>
          <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Repetir (semanas)</span>
          <input inputMode="numeric" value={repeat} onChange={(e) => setRepeat(e.target.value)} style={fieldStyle} />
        </label>
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={send} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Creando…' : 'Programar mensaje'}
      </button>
    </Modal>
  )
}

function groupEvents(events: CalEvent[]): { programs: ProgramGroup[]; loose: CalEvent[] } {
  const map = new Map<string, CalEvent[]>()
  const loose: CalEvent[] = []
  for (const e of events) {
    if (e.program_id) {
      const arr = map.get(e.program_id) || []
      arr.push(e)
      map.set(e.program_id, arr)
    } else loose.push(e)
  }
  const programs: ProgramGroup[] = [...map.entries()].map(([id, evs]) => {
    const dates = evs.map((e) => e.event_date).sort()
    const from = dates[0]
    const to = dates[dates.length - 1]
    const weeks = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (7 * 86400000)) + 1
    return { id, name: evs[0].program_name || 'Programa', events: evs, from, to, weeks }
  })
  programs.sort((a, b) => (a.from < b.from ? 1 : -1))
  return { programs, loose }
}

function ProgramCard({ p, onDelete }: { p: ProgramGroup; onDelete?: () => void }) {
  const [open, setOpen] = useState(false)

  // Desglose semanal: para cada día, los tipos/nombres distintos.
  const breakdown = useMemo(() => {
    const perDay: Record<number, string[]> = {}
    for (const e of p.events) {
      const wd = weekdayOf(e.event_date)
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
              {p.events.length} eventos{p.weeks ? ` · ${p.weeks} semana${p.weeks > 1 ? 's' : ''}` : ''} · desde {p.from}
            </div>
          </div>
        </button>
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

// ---------- Modal: programar semana ----------
function ProgramModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: (n: number) => void }) {
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState<WeekPattern>({})
  const [startMonday, setStartMonday] = useState(mondayOf(todayISO()))
  const [weeks, setWeeks] = useState('4')
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

  const generate = async () => {
    const w = parseInt(weeks, 10)
    if (!name.trim()) return setErr('Ponle un nombre al programa.')
    if (!w || w < 1) return setErr('Indica cuántas semanas repetir.')
    if (Object.values(pattern).every((l) => !l || l.length === 0)) return setErr('Marca al menos un evento en la semana.')
    setBusy(true)
    setErr(null)
    try {
      const n = await generateProgram(clientId, pattern, startMonday, w, name.trim())
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
    <Modal title="Programar semana" onClose={onClose}>
      <div style={{ maxHeight: '64vh', overflowY: 'auto', paddingRight: 4 }} className="om-scroll">
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>NOMBRE DEL PROGRAMA</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bloque fuerza · Semana tipo" style={fieldStyle} />
        </label>

        {templates.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>PLANTILLAS GUARDADAS</div>
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
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Empezar el lunes</span>
            <input type="date" value={startMonday} onChange={(e) => setStartMonday(mondayOf(e.target.value))} style={fieldStyle} />
          </label>
          <label>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Repetir (semanas)</span>
            <input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={fieldStyle} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Guardar patrón como plantilla…" style={{ ...fieldStyle, flex: 1 }} />
          <button onClick={doSave} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
        </div>
      </div>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={generate} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Generando…' : 'Generar programa'}
      </button>
    </Modal>
  )
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
