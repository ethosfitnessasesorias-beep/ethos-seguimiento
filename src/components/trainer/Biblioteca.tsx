import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, type Profile } from '../../lib/db'
import {
  deleteTemplate,
  EVENT_TYPES,
  generateProgram,
  listTemplates,
  todayStr,
  type EventType,
  type ProgramTemplate,
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
  const [msg, setMsg] = useState<string | null>(null)

  const reload = useCallback(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])
  useEffect(reload, [reload])

  const remove = async (t: ProgramTemplate) => {
    if (!confirm(`¿Eliminar la plantilla «${t.name}»?`)) return
    await deleteTemplate(t.id)
    reload()
  }

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Biblioteca</div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Tus estructuras de semana guardadas. Selecciona una y replícala en cualquier cliente.
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
            Cuando programes la semana de un cliente, usa «Guardar patrón en la Biblioteca» y aparecerá aquí para reutilizarla.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>Guardada el {t.created_at.slice(0, 10)}</div>
                </div>
                <button onClick={() => setApplying(t)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Aplicar a cliente
                </button>
                <button onClick={() => remove(t)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 11px', color: mut(0.55), cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
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
          onDone={(n, clientName) => {
            setApplying(null)
            setMsg(`Programa aplicado a ${clientName}: ${n} eventos creados.`)
          }}
        />
      )}
    </div>
  )
}

function ApplyModal({ template, onClose, onDone }: { template: ProgramTemplate; onClose: () => void; onDone: (n: number, clientName: string) => void }) {
  const [clients, setClients] = useState<Profile[]>([])
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState(template.name)
  const [startMonday, setStartMonday] = useState(mondayOf(todayStr()))
  const [weeks, setWeeks] = useState('4')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then((c) => {
        setClients(c)
        if (c.length) setClientId(c[0].id)
      })
      .catch(() => {})
  }, [])

  const apply = async () => {
    const w = parseInt(weeks, 10)
    if (!clientId) return setErr('Elige un cliente.')
    if (!w || w < 1) return setErr('Indica cuántas semanas.')
    setBusy(true)
    setErr(null)
    try {
      const n = await generateProgram(clientId, template.pattern, startMonday, w, name.trim() || template.name)
      const cname = clients.find((c) => c.id === clientId)?.full_name || 'cliente'
      onDone(n, cname)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo aplicar.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Aplicar «${template.name}»`} onClose={onClose}>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={labelStyle}>CLIENTE</span>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ ...fieldStyle, appearance: 'none' }}>
          {clients.map((c) => (
            <option key={c.id} value={c.id} style={{ background: '#111' }}>
              {c.full_name || c.email || 'Cliente'}
            </option>
          ))}
        </select>
      </label>
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
        {busy ? 'Aplicando…' : 'Aplicar programa'}
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
