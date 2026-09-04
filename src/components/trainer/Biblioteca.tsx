import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, type Profile } from '../../lib/db'
import {
  deleteTemplate,
  ESTUDIO_INICIAL_PATTERN,
  EVENT_ORDER,
  EVENT_TYPES,
  generateProgram,
  listTemplates,
  saveTemplate,
  todayStr,
  updateTemplate,
  type EventType,
  type ProgramTemplate,
  type WeekPattern,
} from '../../lib/events'
import Modal from '../Modal'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const off = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - off)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function Biblioteca() {
  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<ProgramTemplate | null>(null)
  const [editing, setEditing] = useState<ProgramTemplate | 'new' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])
  useEffect(reload, [reload])

  const remove = async (t: ProgramTemplate) => {
    if (!confirm(`¿Eliminar la plantilla «${t.name}»? (Los programas ya aplicados a clientes no se tocan.)`)) return
    await deleteTemplate(t.id)
    reload()
  }

  const hasEstudio = templates.some((t) => t.name.trim().toLowerCase() === 'estudio inicial')
  const createEstudio = async () => {
    setCreating(true)
    try {
      await saveTemplate('Estudio Inicial', ESTUDIO_INICIAL_PATTERN)
      setMsg('Plantilla «Estudio Inicial» creada. Aplícala a cualquier cliente nuevo (1 semana suele bastar).')
      reload()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Biblioteca</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!loading && !hasEstudio && (
            <button onClick={createEstudio} disabled={creating} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 'none', opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Creando…' : '⭐ Crear «Estudio Inicial»'}
            </button>
          )}
          <button onClick={() => setEditing('new')} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>
            + Nueva plantilla
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Crea aquí tus semanas tipo y aplícalas a uno o varios clientes de golpe, sin entrar en cada ficha.
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, color: colors.green, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4) }}>Cargando…</div>
      ) : templates.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aún no hay plantillas</div>
          <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            Crea una con «+ Nueva plantilla» o guarda un patrón desde «Programar semana» de cualquier cliente.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>Guardada el {t.created_at.slice(0, 10)}</div>
                </div>
                <button onClick={() => setApplying(t)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 'none' }}>
                  Aplicar a clientes
                </button>
                <button onClick={() => setEditing(t)} title="Editar plantilla" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 11px', color: colors.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, flex: 'none' }}>
                  ✎
                </button>
                <button onClick={() => remove(t)} title="Eliminar plantilla" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 11px', color: mut(0.55), cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, flex: 'none' }}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {DAYS.map((dname, day) => {
                  const entries = t.pattern[day] || []
                  if (entries.length === 0) return null
                  return (
                    <div key={day} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: mut(0.5), width: 72, flex: 'none' }}>{dname}</span>
                      <span style={{ fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {entries.map((e, i) => {
                          const cfg = EVENT_TYPES[e.type as EventType]
                          return (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 7, height: 7, borderRadius: 2, background: cfg?.color ?? '#888' }} />
                              {e.title || cfg?.label}
                              {e.everyWeeks && e.everyWeeks > 1 ? <span style={{ color: mut(0.45), fontSize: 11 }}>(cada {e.everyWeeks} sem.)</span> : null}
                              {e.time ? <span style={{ color: mut(0.45), fontSize: 11 }}>{e.time}</span> : null}
                            </span>
                          )
                        })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {applying && (
        <ApplyModal
          template={applying}
          onClose={() => setApplying(null)}
          onDone={(n, who) => {
            setApplying(null)
            setMsg(`Programa aplicado a ${who}: ${n} eventos creados.`)
          }}
        />
      )}
      {editing && (
        <TemplateModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setMsg('Plantilla guardada ✓')
            reload()
          }}
        />
      )}
    </div>
  )
}

// ---------- Crear / editar una plantilla directamente en la Biblioteca ----------
function TemplateModal({ initial, onClose, onSaved }: { initial: ProgramTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [pattern, setPattern] = useState<WeekPattern>(initial?.pattern ?? {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggle = (day: number, type: EventType) =>
    setPattern((prev) => {
      const list = prev[day] || []
      const exists = list.some((x) => x.type === type)
      return { ...prev, [day]: exists ? list.filter((x) => x.type !== type) : [...list, { type }] }
    })
  const setEntryTitle = (day: number, type: EventType, title: string) =>
    setPattern((prev) => ({ ...prev, [day]: (prev[day] || []).map((x) => (x.type === type ? { ...x, title: title || undefined } : x)) }))
  const setEntryEvery = (day: number, type: EventType, everyWeeks: number) =>
    setPattern((prev) => ({ ...prev, [day]: (prev[day] || []).map((x) => (x.type === type ? { ...x, everyWeeks: everyWeeks > 1 ? everyWeeks : undefined } : x)) }))
  const setEntryTime = (day: number, type: EventType, time: string) =>
    setPattern((prev) => ({ ...prev, [day]: (prev[day] || []).map((x) => (x.type === type ? { ...x, time: time || undefined } : x)) }))
  const has = (day: number, type: EventType) => (pattern[day] || []).some((x) => x.type === type)

  const save = async () => {
    if (!name.trim()) return setErr('Ponle un nombre a la plantilla.')
    if (Object.values(pattern).every((l) => !l || l.length === 0)) return setErr('Marca al menos un evento en la semana.')
    setBusy(true)
    setErr(null)
    try {
      if (initial) await updateTemplate(initial.id, name.trim(), pattern)
      else await saveTemplate(name.trim(), pattern)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title={initial ? `Editar «${initial.name}»` : 'Nueva plantilla'} onClose={onClose}>
      <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 4 }} className="om-scroll">
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={labelStyle}>NOMBRE DE LA PLANTILLA</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Semana tipo · Definición" style={fieldStyle} />
        </label>
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
                      <div key={e.type} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: EVENT_TYPES[e.type as EventType].color, flex: 'none' }} />
                        <input
                          value={e.title ?? ''}
                          onChange={(ev) => setEntryTitle(day, e.type as EventType, ev.target.value)}
                          placeholder={`${EVENT_TYPES[e.type as EventType].label}: nombre (opcional)`}
                          style={{ ...fieldStyle, fontSize: 12, padding: '8px 10px', flex: 1, minWidth: 0 }}
                        />
                        <select
                          value={String(e.everyWeeks ?? 1)}
                          onChange={(ev) => setEntryEvery(day, e.type as EventType, parseInt(ev.target.value, 10))}
                          title="Cada cuántas semanas se repite esta tarea"
                          style={{ ...fieldStyle, fontSize: 11.5, padding: '8px 6px', width: 96, flex: 'none', cursor: 'pointer' }}
                        >
                          <option value="1">cada sem.</option>
                          <option value="2">cada 2 sem.</option>
                          <option value="3">cada 3 sem.</option>
                          <option value="4">cada 4 sem.</option>
                          <option value="6">cada 6 sem.</option>
                          <option value="8">cada 8 sem.</option>
                        </select>
                        <input
                          value={e.time ?? ''}
                          onChange={(ev) => setEntryTime(day, e.type as EventType, ev.target.value)}
                          placeholder="hora"
                          title="Hora (opcional)"
                          style={{ ...fieldStyle, fontSize: 11.5, padding: '8px 6px', width: 58, flex: 'none', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar plantilla'}
      </button>
    </Modal>
  )
}

// ---------- Aplicar una plantilla a UNO O VARIOS clientes a la vez ----------
function ApplyModal({ template, onClose, onDone }: { template: ProgramTemplate; onClose: () => void; onDone: (n: number, who: string) => void }) {
  const [clients, setClients] = useState<Profile[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [name, setName] = useState(template.name)
  const [startMonday, setStartMonday] = useState(mondayOf(todayStr()))
  const [weeks, setWeeks] = useState('4')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
  }, [])

  const toggleClient = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const apply = async () => {
    const w = parseInt(weeks, 10)
    if (sel.size === 0) return setErr('Marca al menos un cliente.')
    if (!w || w < 1) return setErr('Indica cuántas semanas.')
    setBusy(true)
    setErr(null)
    let total = 0
    const failed: string[] = []
    let i = 0
    for (const id of sel) {
      i++
      setProgress(i)
      try {
        total += await generateProgram(id, template.pattern, startMonday, w, name.trim() || template.name)
      } catch {
        failed.push(clients.find((c) => c.id === id)?.full_name || 'cliente')
      }
    }
    if (failed.length) {
      setBusy(false)
      setErr(`No se pudo aplicar a: ${failed.join(', ')}. Al resto sí se aplicó.`)
      return
    }
    onDone(total, sel.size === 1 ? clients.find((c) => sel.has(c.id))?.full_name || '1 cliente' : `${sel.size} clientes`)
  }

  return (
    <Modal title={`Aplicar «${template.name}»`} onClose={onClose}>
      <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>CLIENTES · marca uno o varios</div>
      <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, background: colors.surface2, borderRadius: 10, padding: '8px 10px' }} className="om-scroll">
        {clients.length === 0 ? (
          <div style={{ fontSize: 12, color: mut(0.4), padding: '6px 0' }}>Cargando clientes…</div>
        ) : (
          clients.map((c) => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '4px 0' }}>
              <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggleClient(c.id)} style={{ width: 16, height: 16, accentColor: colors.accent }} />
              <span style={{ fontSize: 13, color: colors.text }}>{c.full_name || c.email || 'Cliente'}</span>
            </label>
          ))
        )}
      </div>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={labelStyle}>NOMBRE DEL PROGRAMA</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label>
          <span style={labelStyle}>Empezar el lunes</span>
          <input type="date" value={startMonday} onChange={(e) => setStartMonday(mondayOf(e.target.value))} style={fieldStyle} />
        </label>
        <label>
          <span style={labelStyle}>Repetir (semanas)</span>
          <input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={fieldStyle} />
        </label>
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={apply} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? `Aplicando ${progress}/${sel.size}…` : sel.size > 1 ? `Aplicar a ${sel.size} clientes` : 'Aplicar programa'}
      </button>
    </Modal>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }
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
