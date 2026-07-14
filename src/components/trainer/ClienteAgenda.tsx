import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  deleteEvent,
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

export default function ClienteAgenda({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [programOpen, setProgramOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const range = useMemo(() => {
    const d = new Date()
    const from = `${d.getFullYear()}-01-01`
    const to = `${d.getFullYear() + 1}-12-31`
    return { from, to }
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

  const upcoming = events.filter((e) => e.event_date >= todayISO())

  const remove = async (e: CalEvent) => {
    if (!confirm('¿Eliminar este evento?')) return
    await deleteEvent(e.id)
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: mut(0.5) }}>Programa los eventos que verá el cliente en su Agenda.</div>
        <button onClick={() => setProgramOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Programar semana
        </button>
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, color: colors.green, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          {msg}
        </div>
      )}

      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Próximos eventos ({upcoming.length})</div>
        {loading ? (
          <div style={{ fontSize: 12.5, color: mut(0.4) }}>Cargando…</div>
        ) : upcoming.length === 0 ? (
          <div style={{ fontSize: 12.5, color: mut(0.4) }}>Sin eventos programados. Pulsa «Programar semana» para empezar.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((e) => {
              const cfg = EVENT_TYPES[e.type]
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${cfg.color}`, padding: '8px 0 8px 11px' }}>
                  <span style={{ fontSize: 12, color: mut(0.5), width: 92, flex: 'none' }}>{e.event_date}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{cfg.label}{e.time ? ` · ${e.time}` : ''}</span>
                  <button onClick={() => remove(e)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {programOpen && (
        <ProgramModal
          clientId={clientId}
          onClose={() => setProgramOpen(false)}
          onDone={(n) => {
            setProgramOpen(false)
            setMsg(`Se han creado ${n} eventos.`)
            reload()
          }}
        />
      )}
    </div>
  )
}

// ---------- Modal: programar semana ----------
function ProgramModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: (n: number) => void }) {
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
  const has = (day: number, type: EventType) => (pattern[day] || []).some((x) => x.type === type)

  const generate = async () => {
    const w = parseInt(weeks, 10)
    if (!w || w < 1) {
      setErr('Indica cuántas semanas repetir.')
      return
    }
    if (Object.values(pattern).every((l) => !l || l.length === 0)) {
      setErr('Marca al menos un evento en la semana.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const n = await generateProgram(clientId, pattern, startMonday, w)
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
  const applyTemplate = (t: ProgramTemplate) => setPattern(t.pattern)
  const removeTemplate = async (t: ProgramTemplate) => {
    await deleteTemplate(t.id)
    setTemplates((s) => s.filter((x) => x.id !== t.id))
  }

  return (
    <Modal title="Programar semana" onClose={onClose}>
      <div style={{ maxHeight: '64vh', overflowY: 'auto', paddingRight: 4 }} className="om-scroll">
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

        <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 8 }}>MARCA LOS EVENTOS DE CADA DÍA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map((dname, day) => (
            <div key={day} style={{ background: colors.surface2, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{dname}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EVENT_ORDER.map((type) => {
                  const on = has(day, type)
                  const cfg = EVENT_TYPES[type]
                  return (
                    <button
                      key={type}
                      onClick={() => toggle(day, type)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${on ? cfg.color : 'rgba(255,255,255,0.12)'}`, borderRadius: 999, padding: '5px 10px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: on ? colors.text : mut(0.55), cursor: 'pointer' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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
          <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Guardar como plantilla…" style={{ ...fieldStyle, flex: 1 }} />
          <button onClick={doSave} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
        </div>
      </div>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={generate} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Generando…' : 'Generar eventos'}
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
