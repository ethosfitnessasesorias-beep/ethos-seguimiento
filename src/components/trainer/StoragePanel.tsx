import { useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import { analyzeStorage, deleteBigFile, deleteOrphans, human, optimizePhoto, type BigFile, type StorageReport } from '../../lib/storage'

const LIMIT = 1024 * 1024 * 1024 // 1 GB del plan gratuito de Supabase

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '13px 15px' }

function Bar({ used }: { used: number }) {
  const pct = Math.min(100, Math.round((used / LIMIT) * 100))
  const over = used > LIMIT
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: mut(0.55), marginBottom: 6 }}>
        <span><b style={{ color: over ? colors.accent : colors.text, fontSize: 13 }}>{human(used)}</b> de 1 GB</span>
        <span style={{ color: over ? colors.accent : mut(0.5) }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: over ? colors.accent : pct > 80 ? '#f5a623' : colors.green, borderRadius: 999 }} />
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12.5, color: mut(0.65), flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{value}</span>
      {hint && <span style={{ fontSize: 10.5, color: mut(0.4) }}>{hint}</span>}
    </div>
  )
}

const actionBtn = (enabled: boolean): React.CSSProperties => ({
  background: enabled ? colors.accent : colors.surface2,
  color: enabled ? '#fff' : mut(0.35),
  border: enabled ? 'none' : '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 14px',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default',
  width: '100%',
})

/**
 * Panel de almacenamiento (solo entrenador). Mide lo que ocupa cada cosa en
 * Supabase y permite reducirlo sin perder nada: borrar archivos huérfanos
 * (los que quedaron sueltos al eliminar clientes) y recomprimir las fotos
 * antiguas que se subieron sin optimizar.
 */
export default function StoragePanel() {
  const [report, setReport] = useState<StorageReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; saved: number } | null>(null)
  const stopRef = useRef(false)

  const analyze = async () => {
    setBusy(true)
    setMsg('Analizando…')
    try {
      const r = await analyzeStorage()
      setReport(r)
      setMsg(null)
    } catch {
      setMsg('No se pudo analizar el almacenamiento.')
    } finally {
      setBusy(false)
    }
  }

  const cleanOrphans = async () => {
    if (!report || report.orphans.length === 0) return
    if (!confirm(`¿Borrar ${report.orphans.length} archivos sueltos (${human(report.orphanBytes)})?\n\nNo están en la base de datos: no los ve nadie ni aparecen en la app. Son restos de clientes eliminados.`)) return
    setBusy(true)
    setMsg('Borrando…')
    try {
      const n = await deleteOrphans(report.orphans)
      setMsg(`✓ ${n} archivos borrados, ${human(report.orphanBytes)} liberados.`)
      await analyze()
    } catch {
      setMsg('No se pudieron borrar.')
    } finally {
      setBusy(false)
    }
  }

  const optimize = async () => {
    if (!report || report.heavy.length === 0) return
    if (!confirm(`¿Optimizar ${report.heavy.length} fotos?\n\nSe bajan, se reescalan a 1600 px y se vuelven a subir. Las fotos siguen ahí y se ven igual en el móvil, solo ocupan mucho menos. Puede tardar unos minutos: no cierres la app.`)) return
    stopRef.current = false
    setBusy(true)
    setMsg(null)
    let saved = 0
    let done = 0
    setProgress({ done: 0, total: report.heavy.length, saved: 0 })
    for (const h of report.heavy) {
      if (stopRef.current) break
      try {
        saved += await optimizePhoto(h.photo, h.size)
      } catch {
        /* una foto que falle no detiene el resto */
      }
      done += 1
      setProgress({ done, total: report.heavy.length, saved })
    }
    setProgress(null)
    setMsg(`✓ ${done} fotos procesadas · ${human(saved)} liberados.`)
    setBusy(false)
    await analyze()
  }

  const removeFile = async (f: BigFile) => {
    if (!confirm(`¿Borrar "${f.label}" (${human(f.size)}) de ${f.clientName}?\n\nEsto sí elimina el archivo para siempre.`)) return
    setBusy(true)
    try {
      await deleteBigFile(f)
      await analyze()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: mut(0.4), fontWeight: 700, margin: '0 2px 10px' }}>ALMACENAMIENTO</div>

      {!report ? (
        <div style={card}>
          <div style={{ fontSize: 12.5, color: mut(0.6), lineHeight: 1.6, marginBottom: 11 }}>
            Mide cuánto ocupan las fotos y los documentos en Supabase y libera espacio sin perder nada.
          </div>
          <button onClick={analyze} disabled={busy} style={actionBtn(!busy)}>
            {busy ? 'Analizando…' : '📊 Analizar almacenamiento'}
          </button>
          {msg && <div style={{ fontSize: 11.5, color: '#f5a99f', marginTop: 9 }}>{msg}</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={card}>
            <Bar used={report.total} />
            <div style={{ marginTop: 11 }}>
              <Row label="📷 Fotos de progreso" value={human(report.photoBytes)} hint={`${report.photoFiles} archivos`} />
              <Row label="📄 Documentos" value={human(report.docBytes)} hint={`${report.docFiles} archivos`} />
            </div>
          </div>

          {/* 1 · archivos huérfanos: borrado seguro, no se ve nada */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🧹 Archivos sueltos</div>
            <div style={{ fontSize: 11.5, color: mut(0.55), lineHeight: 1.6, marginBottom: 10 }}>
              Restos que quedaron en el almacén al eliminar clientes o fotos. No se ven en la app, solo ocupan sitio. Borrarlos es seguro.
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: report.orphanBytes > 0 ? '#f5a623' : colors.green, marginBottom: 10 }}>
              {report.orphans.length} archivos · {human(report.orphanBytes)}
            </div>
            <button onClick={cleanOrphans} disabled={busy || report.orphans.length === 0} style={actionBtn(!busy && report.orphans.length > 0)}>
              {report.orphans.length === 0 ? '✓ Nada que limpiar' : `Borrar y liberar ${human(report.orphanBytes)}`}
            </button>
          </div>

          {/* 2 · recomprimir fotos antiguas */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🗜 Optimizar fotos antiguas</div>
            <div style={{ fontSize: 11.5, color: mut(0.55), lineHeight: 1.6, marginBottom: 10 }}>
              Fotos subidas antes de que la app comprimiera. Se reescalan a 1600 px: se siguen viendo igual en el móvil y ocupan entre un 60 % y un 90 % menos.
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: report.heavy.length > 0 ? '#f5a623' : colors.green, marginBottom: 10 }}>
              {report.heavy.length} fotos pesadas · {human(report.heavyBytes)}
            </div>
            {progress ? (
              <div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${Math.round((progress.done / progress.total) * 100)}%`, height: '100%', background: colors.accent, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 11.5, color: mut(0.6), marginBottom: 9 }}>
                  {progress.done} de {progress.total} · {human(progress.saved)} liberados
                </div>
                <button onClick={() => { stopRef.current = true }} style={{ ...actionBtn(true), background: colors.surface2, color: mut(0.7), border: '1px solid rgba(255,255,255,0.12)' }}>
                  Parar
                </button>
              </div>
            ) : (
              <button onClick={optimize} disabled={busy || report.heavy.length === 0} style={actionBtn(!busy && report.heavy.length > 0)}>
                {report.heavy.length === 0 ? '✓ Todas optimizadas' : `Optimizar ${report.heavy.length} fotos`}
              </button>
            )}
          </div>

          {/* 3 · reparto por cliente */}
          {report.byClient.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>👤 Quién ocupa más</div>
              {report.byClient.slice(0, 12).map((c) => (
                <Row
                  key={c.id}
                  label={`${c.name}${c.active ? '' : ' · baja'}`}
                  value={human(c.bytes)}
                  hint={`${c.files} arch.`}
                />
              ))}
            </div>
          )}

          {/* 4 · archivos más grandes, por si hay que borrar a mano */}
          {report.bigFiles.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📦 Archivos más grandes</div>
              <div style={{ fontSize: 11.5, color: mut(0.55), lineHeight: 1.6, marginBottom: 9 }}>
                Por si hay algo que ya no haga falta (planificaciones viejas, vídeos…).
              </div>
              {report.bigFiles.map((f) => (
                <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
                    <div style={{ fontSize: 10.5, color: mut(0.45), marginTop: 2 }}>{f.clientName} · {f.kind}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 'none' }}>{human(f.size)}</span>
                  <button onClick={() => removeFile(f)} disabled={busy} title="Borrar" style={{ background: 'none', border: 'none', color: mut(0.35), cursor: 'pointer', fontSize: 13, padding: 0, flex: 'none' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button onClick={analyze} disabled={busy} style={{ ...actionBtn(!busy), background: colors.surface2, color: mut(0.7), border: '1px solid rgba(255,255,255,0.12)' }}>
            {busy ? '…' : '↻ Volver a analizar'}
          </button>
          {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? colors.green : '#f5a99f', textAlign: 'center' }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
