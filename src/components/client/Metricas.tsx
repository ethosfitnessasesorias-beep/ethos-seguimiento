import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addPerimeters,
  addWeight,
  listPerimeters,
  listWeights,
  PERIMETER_FIELDS,
  type PerimeterLog,
  type WeightLog,
} from '../../lib/db'
import type { Profile } from '../../lib/db'
import { perimeterRows, shortDate, weightChart } from '../../lib/metrics'
import Modal from '../Modal'
import ProgressPhotos from '../ProgressPhotos'
import PhotoCompare from '../PhotoCompare'
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

export default function Metricas({ profile }: { profile: Profile }) {
  const clientId = profile.id
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [perims, setPerims] = useState<PerimeterLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'weight' | 'perim'>(null)

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
                color: diff < 0 ? colors.green : colors.amber,
                background: diff < 0 ? 'rgba(74,222,128,0.12)' : 'rgba(245,166,35,0.12)',
                padding: '4px 9px',
                borderRadius: 999,
                marginTop: 6,
              }}
            >
              {diff < 0 ? '▼' : '▲'} {Math.abs(diff)} kg
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
      </div>

      {/* registro fotográfico */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Registro fotográfico</div>
        <ProgressPhotos clientId={clientId} canUpload columns={3} />
      </div>

      {/* comparador antes / después */}
      <div style={{ ...card, padding: 17, marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Antes / después</div>
        <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 13 }}>Compara tu evolución entre dos fechas</div>
        <PhotoCompare clientId={clientId} />
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
    </div>
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
