import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { addLog, archiveLogsBefore, deleteLog, listLogs, logKind, LOG_KINDS, monthsAgoISO, setLogArchived, type ClientLog, type LogKind } from '../../lib/logs'
import { fullDate } from '../../lib/metrics'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: mut(0.5), cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, textAlign: 'left', padding: 0 }

/** Una fila del historial, con sus acciones (archivar / recuperar / eliminar). */
function LogRow({ l, onArchive, onDelete, archived }: { l: ClientLog; onArchive: () => void; onDelete: () => void; archived: boolean }) {
  const k = logKind(l.kind)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 9, borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: archived ? 0.65 : 1 }}>
      <span style={{ fontSize: 13, flex: 'none', marginTop: 1 }}>{k.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: k.color, fontWeight: 600 }}>
          {k.label} · <span style={{ color: mut(0.45) }}>{fullDate(l.log_date)}</span>
        </div>
        <div style={{ fontSize: 12.5, color: colors.text, marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{l.body}</div>
      </div>
      <button
        onClick={onArchive}
        title={archived ? 'Recuperar' : 'Archivar (no se borra)'}
        style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flex: 'none' }}
      >
        {archived ? '↩' : '📥'}
      </button>
      <button onClick={onDelete} title="Eliminar" style={{ background: 'none', border: 'none', color: mut(0.35), cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flex: 'none' }}>✕</button>
    </div>
  )
}

/**
 * Historial de contacto con el cliente. El cliente no lo ve.
 * Las anotaciones se pueden ARCHIVAR: salen de la vista normal pero no se
 * borran, quedan guardadas en "Archivadas". Así el historial no crece sin
 * control con el paso de los meses y no hace falta eliminar nada.
 */
export default function ContactLog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<ClientLog[]>([])
  const [arch, setArch] = useState<ClientLog[]>([])
  const [kind, setKind] = useState<LogKind>('llamada')
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [openArch, setOpenArch] = useState(false)
  const [showAllArch, setShowAllArch] = useState(false)
  const [months, setMonths] = useState(3)

  const load = () => {
    listLogs(clientId).then(setLogs).catch(() => setLogs([]))
    listLogs(clientId, true).then(setArch).catch(() => setArch([]))
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

  const archive = async (l: ClientLog, value: boolean) => {
    await setLogArchived(l.id, value)
    load()
  }

  const remove = async (l: ClientLog) => {
    if (!confirm('¿Eliminar esta anotación para siempre? Si solo quieres quitarla de la vista, usa 📥 archivar.')) return
    await deleteLog(l.id)
    load()
  }

  const archiveOld = async () => {
    const before = monthsAgoISO(months)
    if (!confirm(`¿Archivar todas las anotaciones anteriores a ${fullDate(before)}? No se borran, quedan en "Archivadas".`)) return
    setBusy(true)
    try {
      const n = await archiveLogsBefore(clientId, before)
      load()
      if (n === 0) alert('No había anotaciones tan antiguas.')
    } finally {
      setBusy(false)
    }
  }

  const last = logs[0] ?? arch[0]
  const shown = showAll ? logs : logs.slice(0, 8)
  const shownArch = showAllArch ? arch : arch.slice(0, 10)
  const oldCount = logs.filter((l) => l.log_date < monthsAgoISO(months)).length

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>🗒 Historial de contacto</span>
        <span style={{ fontSize: 10.5, color: mut(0.4) }}>
          {logs.length === 0 && arch.length === 0
            ? 'sin anotaciones'
            : `${logs.length}${arch.length > 0 ? ` (+${arch.length} archiv.)` : ''}${last ? ` · último ${last.log_date}` : ''}`}
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

          {/* línea de tiempo (solo las activas) */}
          {logs.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {shown.map((l) => (
                <LogRow key={l.id} l={l} archived={false} onArchive={() => archive(l, true)} onDelete={() => remove(l)} />
              ))}
              {logs.length > 8 && (
                <button onClick={() => setShowAll((v) => !v)} style={linkBtn}>
                  {showAll ? '▴ Ver solo las últimas' : `▾ Ver las ${logs.length} anotaciones`}
                </button>
              )}
            </div>
          )}

          {/* limpieza masiva: archiva lo antiguo de una vez */}
          {logs.length > 3 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: colors.surface2, borderRadius: 11, padding: '9px 11px' }}>
              <span style={{ fontSize: 11.5, color: mut(0.5) }}>Archivar lo anterior a</span>
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 9px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                <option value={1}>1 mes</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>1 año</option>
              </select>
              <button onClick={archiveOld} disabled={busy || oldCount === 0} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${oldCount === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)'}`, borderRadius: 9, padding: '7px 12px', color: oldCount === 0 ? mut(0.3) : colors.text, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: oldCount === 0 ? 'default' : 'pointer' }}>
                📥 Archivar {oldCount > 0 ? oldCount : ''}
              </button>
            </div>
          )}

          {/* archivadas */}
          {arch.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
              <button onClick={() => setOpenArch((v) => !v)} style={{ ...linkBtn, display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}>
                <span style={{ color: mut(0.4), fontSize: 11 }}>{openArch ? '▾' : '▸'}</span>
                <span>📦 Archivadas ({arch.length})</span>
              </button>
              {openArch && (
                <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {shownArch.map((l) => (
                    <LogRow key={l.id} l={l} archived onArchive={() => archive(l, false)} onDelete={() => remove(l)} />
                  ))}
                  {arch.length > 10 && (
                    <button onClick={() => setShowAllArch((v) => !v)} style={linkBtn}>
                      {showAllArch ? '▴ Ver menos' : `▾ Ver las ${arch.length} archivadas`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
