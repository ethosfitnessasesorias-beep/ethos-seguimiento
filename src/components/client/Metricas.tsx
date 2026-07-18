import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addPerimeters,
  addWeight,
  deletePerimeter,
  deleteWeight,
  updateWeight,
  listPerimeters,
  listWeights,
  PERIMETER_FIELDS,
  type PerimeterLog,
  type WeightLog,
} from '../../lib/db'
import type { Profile } from '../../lib/db'
import { changeColor, fullDate, perimeterRows, shortDate, weightChart } from '../../lib/metrics'
import Modal from '../Modal'
import ProgressPhotos from '../ProgressPhotos'
import Composicion from '../Composicion'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  background: colors.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  width: '100%',
  background: colors.surface2,
  color: colors.text,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: 11,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const histToggle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: mut(0.5),
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  padding: '10px 2px 4px',
}

const histRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '9px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
}

const delBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: mut(0.4),
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 4px',
  lineHeight: 1,
  flex: 'none',
}

interface MetricasProps {
  profile: Profile
  initialAction?: 'weight' | 'perim' | 'photo' | null
  onConsumed?: () => void
}

export default function Metricas({ profile, initialAction, onConsumed }: MetricasProps) {
  const clientId = profile.id
  const [photoPick, setPhotoPick] = useState(0)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [perims, setPerims] = useState<PerimeterLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'weight' | 'perim'>(null)
  const [showWHist, setShowWHist] = useState(false)
  const [showPHist, setShowPHist] = useState(false)
  const [editW, setEditW] = useState<WeightLog | null>(null)

  const removeWeight = async (id: string) => {
    if (!confirm('¿Eliminar este registro de peso?')) return
    try {
      await deleteWeight(id, clientId)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }
  const removePerimeter = async (id: string) => {
    if (!confirm('¿Eliminar este registro de perímetros?')) return
    try {
      await deletePerimeter(id)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  const refresh = useCallback(async () => {
    try {
      setErr(null)
      const [w, p] = await Promise.all([listWeights(clientId), listPerimeters(clientId)])
      setWeights(w)
      setPerims(p)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar tus métricas.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Al llegar desde un evento de la agenda, abre directamente la acción.
  useEffect(() => {
    if (!initialAction) return
    if (initialAction === 'weight') setModal('weight')
    else if (initialAction === 'perim') setModal('perim')
    else if (initialAction === 'photo') setPhotoPick((n) => n + 1)
    onConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAction])

  const latest = weights.length ? Number(weights[weights.length - 1].weight) : null
  const first = weights.length ? Number(weights[0].weight) : null
  const diff = latest != null && first != null ? +(latest - first).toFixed(1) : null
  const chart = weightChart(weights, 320, 80, 8, 10)
  const rows = perimeterRows(perims)

  return (
    <div>
      {err && (
        <div style={{ fontSize: 12, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* peso */}
      <div style={{ ...card, padding: '17px 17px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: mut(0.5), fontWeight: 500 }}>Peso corporal</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>
              {latest != null ? latest : '—'}
              <span style={{ fontSize: 14, fontWeight: 500, color: mut(0.5) }}> kg</span>
            </div>
          </div>
          {diff != null && diff !== 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: changeColor(diff),
                background: diff > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(219,24,9,0.12)',
                padding: '4px 9px',
                borderRadius: 999,
                marginTop: 6,
              }}
            >
              {diff > 0 ? '▲ +' : '▼ '}{diff} kg
            </span>
          )}
        </div>

        {chart ? (
          <svg viewBox="0 0 320 80" style={{ width: '100%', height: 64, marginTop: 6, display: 'block' }}>
            <path d={chart.area} fill="rgba(219,24,9,0.14)" />
            <path d={chart.line} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ fontSize: 12, color: mut(0.4), padding: '18px 0 8px' }}>
            {loading ? 'Cargando…' : latest != null ? 'Registra otro día para ver tu evolución.' : 'Aún no has registrado tu peso.'}
          </div>
        )}

        <button style={{ ...primaryBtn, marginTop: 8 }} onClick={() => setModal('weight')}>
          + Registrar peso de hoy
        </button>

        {weights.length > 0 && (
          <>
            <button onClick={() => setShowWHist((s) => !s)} style={histToggle}>
              {showWHist ? '▾ Ocultar registros' : `▸ Ver y editar registros (${weights.length})`}
            </button>
            {showWHist && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8, paddingBottom: 4 }} className="om-scroll">
                {[...weights].reverse().map((w) => (
                  <div key={w.id} style={{ flex: 'none', width: 116, background: colors.surface2, borderRadius: 10, padding: '9px 10px' }}>
                    <div style={{ fontSize: 10, color: mut(0.5) }}>{fullDate(w.log_date)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{Number(w.weight)} <span style={{ fontSize: 9.5, color: mut(0.4) }}>kg</span></div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                      <button onClick={() => setEditW(w)} style={{ flex: 1, background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 0', color: mut(0.7), cursor: 'pointer', fontFamily: 'inherit', fontSize: 10.5, fontWeight: 600 }}>✎</button>
                      <button onClick={() => removeWeight(w.id)} title="Eliminar" style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 8px', color: mut(0.5), cursor: 'pointer', fontFamily: 'inherit', fontSize: 10.5 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* perímetros */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Registro de perímetros</div>
          {perims.length > 0 && (
            <span style={{ fontSize: 11, color: mut(0.4) }}>últ. {shortDate(perims[perims.length - 1].log_date)}</span>
          )}
        </div>
        {rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.map((p) => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13, color: mut(0.8) }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {p.v}
                    <span style={{ fontSize: 10, color: mut(0.4) }}> cm</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, minWidth: 44, textAlign: 'right' }}>{p.delta ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: mut(0.4), padding: '4px 0 10px' }}>
            {loading ? 'Cargando…' : 'Aún no has registrado tus perímetros.'}
          </div>
        )}
        <button style={{ ...ghostBtn, marginTop: 12 }} onClick={() => setModal('perim')}>
          Registrar perímetros
        </button>

        {perims.length > 0 && (
          <>
            <button onClick={() => setShowPHist((s) => !s)} style={histToggle}>
              {showPHist ? '▾ Ocultar registros' : `▸ Ver y editar registros (${perims.length})`}
            </button>
            {showPHist && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
                {[...perims].reverse().map((p) => {
                  const vals = PERIMETER_FIELDS.filter((f) => p[f.key] != null)
                    .map((f) => `${f.label} ${p[f.key]}`)
                    .join(' · ')
                  return (
                    <div key={p.id} style={{ ...histRow, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: mut(0.7), fontWeight: 600 }}>{fullDate(p.log_date)}</div>
                        <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2, lineHeight: 1.4 }}>{vals || 'Sin valores'}</div>
                      </div>
                      <button onClick={() => removePerimeter(p.id)} title="Eliminar" style={delBtn}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* registro fotográfico (con comparativa al tocar 2 fotos) */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Registro fotográfico</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 13 }}>Organiza en carpetas. Toca 2 fotos para ver tu antes / después</div>
        <ProgressPhotos clientId={clientId} canUpload columns={4} selectable autoPick={photoPick} />
      </div>

      {/* composición corporal */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Composición corporal</div>
        <div style={{ fontSize: 11, color: mut(0.4), margin: '3px 0 13px' }}>Estimada según peso y perímetros</div>
        <Composicion sex={profile.sex} heightCm={profile.height_cm} weight={latest} perim={perims[perims.length - 1] ?? null} />
      </div>

      {modal === 'weight' && (
        <WeightModal onClose={() => setModal(null)} onSaved={refresh} clientId={clientId} last={latest} />
      )}
      {modal === 'perim' && (
        <PerimModal onClose={() => setModal(null)} onSaved={refresh} clientId={clientId} last={perims[perims.length - 1] ?? null} />
      )}
      {editW && (
        <EditWeightModal clientId={clientId} log={editW} onClose={() => setEditW(null)} onSaved={async () => { setEditW(null); await refresh() }} />
      )}
    </div>
  )
}

// ---------- Modal: editar pesaje ----------
function EditWeightModal({ clientId, log, onClose, onSaved }: { clientId: string; log: WeightLog; onClose: () => void; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(String(Number(log.weight)))
  const [date, setDate] = useState(log.log_date.slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = parseFloat(value.replace(',', '.'))
    if (!isFinite(n) || n <= 0) return setErr('Escribe un peso válido.')
    setBusy(true)
    try {
      await updateWeight(log.id, clientId, n, date || undefined)
      await onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Editar pesaje" onClose={onClose}>
      <NumberField label="Peso (kg)" value={value} onChange={setValue} autoFocus />
      <label style={{ display: 'block', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
      </label>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button style={{ ...primaryBtn, marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </Modal>
  )
}

// ---------- Modal: registrar peso ----------
function WeightModal({ clientId, last, onClose, onSaved }: { clientId: string; last: number | null; onClose: () => void; onSaved: () => Promise<void>; }) {
  const [value, setValue] = useState(last != null ? String(last) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = parseFloat(value.replace(',', '.'))
    if (!isFinite(n) || n <= 0) {
      setErr('Escribe un peso válido.')
      return
    }
    setBusy(true)
    try {
      await addWeight(clientId, n)
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar peso de hoy" onClose={onClose}>
      <NumberField label="Peso (kg)" value={value} onChange={setValue} placeholder="83.6" autoFocus />
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button style={{ ...primaryBtn, marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
  )
}

// ---------- Modal: registrar perímetros ----------
function PerimModal({ clientId, last, onClose, onSaved }: { clientId: string; last: PerimeterLog | null; onClose: () => void; onSaved: () => Promise<void>; }) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PERIMETER_FIELDS) {
      const prev = last ? (last[f.key] as number | null) : null
      init[f.key] = prev != null ? String(prev) : ''
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const payload: Record<string, number> = {}
    for (const f of PERIMETER_FIELDS) {
      const raw = vals[f.key]?.trim()
      if (raw) {
        const n = parseFloat(raw.replace(',', '.'))
        if (isFinite(n)) payload[f.key] = n
      }
    }
    if (Object.keys(payload).length === 0) {
      setErr('Rellena al menos un perímetro.')
      return
    }
    setBusy(true)
    try {
      await addPerimeters(clientId, payload)
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar perímetros" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {PERIMETER_FIELDS.map((f) => (
          <NumberField key={f.key} label={`${f.label} (cm)`} value={vals[f.key]} onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))} />
        ))}
      </div>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button style={{ ...primaryBtn, marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
  )
}

function NumberField({ label, value, onChange, placeholder, autoFocus }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        autoFocus={autoFocus}
        style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </label>
  )
}
