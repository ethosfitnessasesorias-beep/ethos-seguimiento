import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { addLog, deleteLog, listLogs, logKind, LOG_KINDS, type ClientLog, type LogKind } from '../../lib/logs'
import { fullDate } from '../../lib/metrics'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

/** Historial de contacto con el cliente. El cliente no lo ve. */
export default function ContactLog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<ClientLog[]>([])
  const [kind, setKind] = useState<LogKind>('llamada')
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = () => {
    listLogs(clientId).then(setLogs).catch(() => setLogs([]))
  }
  useEffect(load, [clientId])

  const save = async () => {
    if (!body.trim()) return
    setBusy(true)
    try {
      await addLog(clientId, kind, body, date || undefined)
      setBody('')
      setDate('')
      load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (l: ClientLog) => {
    if (!confirm('¿Eliminar esta anotación del historial?')) return
    await deleteLog(l.id)
    load()
  }

  const last = logs[0]
  const shown = showAll ? logs : logs.slice(0, 8)

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>🗒 Historial de contacto</span>
        <span style={{ fontSize: 10.5, color: mut(0.4) }}>
          {logs.length === 0 ? 'sin anotaciones' : `${logs.length} · último ${last.log_date}`}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {/* nueva anotación */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {LOG_KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                style={{ background: kind === k.key ? 'rgba(255,255,255,0.07)' : 'transparent', border: `1px solid ${kind === k.key ? k.color : 'rgba(255,255,255,0.12)'}`, borderRadius: 999, padding: '5px 11px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: kind === k.key ? colors.text : mut(0.55), cursor: 'pointer' }}
              >
                {k.icon} {k.label}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="¿Qué habéis hablado? (ej: llamada de seguimiento, le cuesta la cena, viaja 2 semanas…)"
            rows={2}
            style={{ width: '100%', background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '9px 11px', color: colors.text, fontFamily: 'inherit', fontSize: 12.5, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: mut(0.5) }}>
              Fecha
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Por defecto, hoy" style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 9px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
            </label>
            <button onClick={save} disabled={busy || !body.trim()} style={{ marginLeft: 'auto', background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: busy || !body.trim() ? 0.5 : 1 }}>
              + Anotar
            </button>
          </div>

          {/* línea de tiempo */}
          {logs.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {shown.map((l) => {
                const k = logKind(l.kind)
                return (
                  <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 9, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13, flex: 'none', marginTop: 1 }}>{k.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: k.color, fontWeight: 600 }}>
                        {k.label} · <span style={{ color: mut(0.45) }}>{fullDate(l.log_date)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: colors.text, marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{l.body}</div>
                    </div>
                    <button onClick={() => remove(l)} title="Eliminar" style={{ background: 'none', border: 'none', color: mut(0.35), cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flex: 'none' }}>✕</button>
                  </div>
                )
              })}
              {logs.length > 8 && (
                <button onClick={() => setShowAll((v) => !v)} style={{ background: 'none', border: 'none', color: mut(0.5), cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, textAlign: 'left', padding: 0 }}>
                  {showAll ? '▴ Ver solo las últimas' : `▾ Ver las ${logs.length} anotaciones`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
