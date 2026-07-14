import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  getProfile,
  listPerimeters,
  listWeights,
  updateProfile,
  PERIMETER_FIELDS,
  type PerimeterLog,
  type Profile,
  type WeightLog,
} from '../../lib/db'
import { METRIC_OPTIONS, perimeterRows, perimeterSeries, shortDate, weightSeries } from '../../lib/metrics'
import { listSubmissions, setReviewed, type FormSubmission } from '../../lib/forms'
import Modal from '../Modal'
import MetricChart from '../MetricChart'
import ProgressPhotos from '../ProgressPhotos'
import ClienteAgenda from './ClienteAgenda'
import ClienteDocumentos from './ClienteDocumentos'
import type { TrainerTab } from './TrainerApp'

interface Props {
  clientId: string
  tTab: TrainerTab
  setTTab: (t: TrainerTab) => void
  goClientes: () => void
}

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
}

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const dash = (v: unknown, suffix = '') => (v == null || v === '' ? '—' : `${v}${suffix}`)

export default function ClienteDetalle({ clientId, tTab, setTTab, goClientes }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [perims, setPerims] = useState<PerimeterLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getProfile(clientId), listWeights(clientId), listPerimeters(clientId)])
      .then(([p, w, pr]) => {
        setProfile(p)
        setWeights(w)
        setPerims(pr)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [clientId])

  const name = profile?.full_name || 'Cliente'
  const current = weights.length ? Number(weights[weights.length - 1].weight) : profile?.current_weight ?? null
  const target = profile?.target_weight ?? null

  const subTab = (key: TrainerTab, label: string) => {
    const active = tTab === key
    return (
      <button
        onClick={() => setTTab(key)}
        style={{ background: 'none', border: 'none', borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`, color: active ? colors.text : mut(0.5), fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '11px 6px', cursor: 'pointer' }}
      >
        {label}
      </button>
    )
  }

  return (
    <div>
      {/* breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18 }}>
        <span onClick={goClientes} style={{ color: mut(0.5), cursor: 'pointer' }}>Clientes</span>
        <span style={{ color: mut(0.3) }}>/</span>
        <span style={{ color: colors.accent, fontWeight: 600 }}>{name}</span>
      </div>

      {/* header */}
      <div style={{ ...card, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
          {initials(profile?.full_name ?? null)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', color: '#f5a99f', padding: '3px 10px', borderRadius: 999 }}>
              {profile?.plan ? `Plan ${profile.plan}` : 'Sin plan'}
            </span>
            <span style={{ fontSize: 12, color: mut(0.5) }}>{profile?.email || ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <HeaderStat label="Peso actual" value={current != null ? String(current) : '—'} />
          <HeaderStat label="Objetivo" value={target != null ? String(target) : '—'} color={colors.accent} />
          <button
            onClick={() => setEditing(true)}
            style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Editar ficha
          </button>
        </div>
      </div>

      {/* ficha del cliente */}
      {profile && <FichaCard p={profile} />}

      {/* sub tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '20px 0 22px', flexWrap: 'wrap' }}>
        {subTab('evolucion', 'Evolución')}
        {subTab('fotos', 'Control fotográfico')}
        {subTab('formularios', 'Formularios')}
        {subTab('agenda', 'Agenda')}
        {subTab('documentos', 'Documentos')}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4), padding: 20 }}>Cargando datos del cliente…</div>
      ) : tTab === 'evolucion' ? (
        <Evolucion weights={weights} perims={perims} target={target} />
      ) : tTab === 'fotos' ? (
        <div style={{ ...card, padding: 22 }}>
          <div style={{ fontSize: 13, color: mut(0.5), marginBottom: 16 }}>
            Fotos de progreso subidas por {name}, ordenadas por fecha.
          </div>
          <ProgressPhotos clientId={clientId} columns={4} />
        </div>
      ) : tTab === 'formularios' ? (
        <TrainerForms clientId={clientId} />
      ) : tTab === 'agenda' ? (
        <ClienteAgenda clientId={clientId} />
      ) : (
        <ClienteDocumentos clientId={clientId} />
      )}

      {editing && profile && (
        <EditClientModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function FichaCard({ p }: { p: Profile }) {
  const items = [
    { label: 'Altura', value: dash(p.height_cm, ' cm') },
    { label: 'Edad', value: dash(p.age, ' años') },
    { label: 'Teléfono', value: dash(p.phone) },
    { label: 'Ciudad', value: dash(p.city) },
  ]
  return (
    <div style={{ ...card, padding: '18px 22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 4 }}>
        {items.map((it) => (
          <div key={it.label}>
            <div style={{ fontSize: 10.5, color: mut(0.4), fontWeight: 600, letterSpacing: 0.5 }}>{it.label.toUpperCase()}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{it.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>
        <FichaText label="Lesiones" value={p.injuries} />
        <FichaText label="Patologías y alergias" value={p.pathologies} />
      </div>
      <div style={{ marginTop: 14 }}>
        <FichaText label="Objetivo principal" value={p.main_goal} />
      </div>
    </div>
  )
}

function FichaText({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: mut(0.4), fontWeight: 600, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.5, color: value ? mut(0.85) : mut(0.35) }}>
        {value || 'Sin datos'}
      </div>
    </div>
  )
}

function HeaderStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color }}>{value}</div>
    </div>
  )
}

function Evolucion({ weights, perims, target }: { weights: WeightLog[]; perims: PerimeterLog[]; target: number | null }) {
  const [metric, setMetric] = useState('weight')
  const [showAll, setShowAll] = useState(false)
  const rows = perimeterRows(perims)
  const first = weights.length ? Number(weights[0].weight) : null
  const current = weights.length ? Number(weights[weights.length - 1].weight) : null
  const progress = first != null && current != null ? +(current - first).toFixed(1) : null
  const pct =
    first != null && current != null && target != null && first !== target
      ? Math.max(0, Math.min(100, Math.round(((first - current) / (first - target)) * 100)))
      : null

  const opt = METRIC_OPTIONS.find((m) => m.key === metric) ?? METRIC_OPTIONS[0]
  const series = metric === 'weight' ? weightSeries(weights) : perimeterSeries(perims, metric)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Evolución · {opt.label}</div>
            <div style={{ fontSize: 11, color: mut(0.4), marginTop: 2 }}>{opt.unit} · registrado por el cliente</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {METRIC_OPTIONS.map((m) => {
              const active = m.key === metric
              return (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  style={{ fontSize: 11, fontWeight: 600, background: active ? m.color : colors.surface2, color: active ? '#fff' : mut(0.6), border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
        <MetricChart points={series} color={opt.color} unit={opt.unit} height={240} />

        <button
          onClick={() => setShowAll((s) => !s)}
          style={{ marginTop: 14, background: 'none', border: 'none', color: colors.accent, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {showAll ? '▾ Ocultar todos los registros' : '▸ Ver todos los registros'}
        </button>
        {showAll && <AllRecords weights={weights} perims={perims} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Resumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="Peso inicial" value={first != null ? `${first} kg` : '—'} />
            <Row label="Peso actual" value={current != null ? `${current} kg` : '—'} />
            <Row label="Objetivo" value={target != null ? `${target} kg` : '—'} valueColor={colors.accent} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <Row
              label="Progreso"
              value={progress != null ? `${progress > 0 ? '+' : ''}${progress} kg${pct != null ? ` (${pct}%)` : ''}` : '—'}
              valueColor={progress != null && progress <= 0 ? colors.green : undefined}
              bold
            />
          </div>
        </div>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Perímetros (último)</div>
          {rows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((p) => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 12.5, color: mut(0.75) }}>{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.v} cm</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, width: 42, textAlign: 'right' }}>{p.delta ?? ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: mut(0.4) }}>Sin perímetros registrados aún.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tabla con TODOS los registros (peso y perímetros) por fecha.
function AllRecords({ weights, perims }: { weights: WeightLog[]; perims: PerimeterLog[] }) {
  const th: React.CSSProperties = { fontSize: 10.5, color: mut(0.4), fontWeight: 600, textAlign: 'right', padding: '6px 8px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { fontSize: 12, textAlign: 'right', padding: '7px 8px', whiteSpace: 'nowrap' }
  const wDesc = [...weights].reverse()
  const pDesc = [...perims].reverse()
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Peso corporal</div>
        {wDesc.length === 0 ? (
          <div style={{ fontSize: 12, color: mut(0.4) }}>Sin registros.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wDesc.map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                <span style={{ color: mut(0.6) }}>{shortDate(w.log_date)}</span>
                <span style={{ fontWeight: 600 }}>{Number(w.weight)} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }} className="om-scroll">
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Perímetros (cm)</div>
        {pDesc.length === 0 ? (
          <div style={{ fontSize: 12, color: mut(0.4) }}>Sin registros.</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Fecha</th>
                {PERIMETER_FIELDS.map((f) => (
                  <th key={f.key} style={th}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pDesc.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ ...td, textAlign: 'left', color: mut(0.6) }}>{shortDate(p.log_date)}</td>
                  {PERIMETER_FIELDS.map((f) => (
                    <td key={f.key} style={td}>{(p[f.key] as number | null) ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: mut(0.55) }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color: valueColor }}>{value}</span>
    </div>
  )
}

// ---------- Formularios (respuestas del cliente) ----------
function TrainerForms({ clientId }: { clientId: string }) {
  const [subs, setSubs] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    listSubmissions(clientId)
      .then(setSubs)
      .finally(() => setLoading(false))
  }
  useEffect(reload, [clientId])

  const toggle = async (s: FormSubmission) => {
    await setReviewed(s.id, !s.reviewed)
    reload()
  }

  if (loading) return <div style={{ fontSize: 13, color: mut(0.4), padding: 20 }}>Cargando formularios…</div>
  if (subs.length === 0) {
    return (
      <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Sin formularios todavía</div>
        <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
          Cuando el cliente rellene un reporte o un cambio de planificación desde su app, aparecerá aquí.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {subs.map((f) => (
        <FormAccordion key={f.id} f={f} onToggleReviewed={() => toggle(f)} />
      ))}
    </div>
  )
}

function FormAccordion({ f, onToggleReviewed }: { f: FormSubmission; onToggleReviewed: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ ...card, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
          <span style={{ color: mut(0.4), fontSize: 12, width: 14 }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{f.form_title}</span>
          <span style={{ fontSize: 11, color: mut(0.45) }}>{f.created_at.slice(0, 10)}</span>
        </button>
        <button
          onClick={onToggleReviewed}
          style={{ fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: f.reviewed ? colors.green : colors.accent, background: f.reviewed ? 'rgba(74,222,128,0.12)' : 'rgba(219,24,9,0.14)', border: 'none', padding: '4px 11px', borderRadius: 999, fontFamily: 'inherit', flex: 'none' }}
        >
          {f.reviewed ? '✓ Revisado' : 'Marcar revisado'}
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, paddingTop: 4 }}>
          {f.answers.map((qa, j) => (
            <div key={j}>
              <div style={{ fontSize: 12, color: mut(0.5), marginBottom: 3 }}>{qa.q}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5 }}>{qa.a || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Modal: editar ficha del cliente ----------
function EditClientModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    full_name: profile.full_name ?? '',
    plan: profile.plan ?? '',
    age: profile.age != null ? String(profile.age) : '',
    height_cm: profile.height_cm != null ? String(profile.height_cm) : '',
    target_weight: profile.target_weight != null ? String(profile.target_weight) : '',
    phone: profile.phone ?? '',
    city: profile.city ?? '',
    injuries: profile.injuries ?? '',
    pathologies: profile.pathologies ?? '',
    main_goal: profile.main_goal ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return s.trim() === '' || !isFinite(n) ? null : n
  }
  const txt = (s: string) => (s.trim() === '' ? null : s.trim())

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await updateProfile(profile.id, {
        full_name: txt(f.full_name),
        plan: txt(f.plan),
        age: num(f.age),
        height_cm: num(f.height_cm),
        target_weight: num(f.target_weight),
        phone: txt(f.phone),
        city: txt(f.city),
        injuries: txt(f.injuries),
        pathologies: txt(f.pathologies),
        main_goal: txt(f.main_goal),
      })
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Editar ficha · ${profile.full_name || 'Cliente'}`} onClose={onClose}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }} className="om-scroll">
        <Field label="Nombre y apellidos" value={f.full_name} onChange={set('full_name')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Plan" value={f.plan} onChange={set('plan')} placeholder="Definición" />
          <Field label="Edad" value={f.age} onChange={set('age')} placeholder="34" />
          <Field label="Altura (cm)" value={f.height_cm} onChange={set('height_cm')} placeholder="178" />
          <Field label="Peso objetivo (kg)" value={f.target_weight} onChange={set('target_weight')} placeholder="80" />
          <Field label="Teléfono" value={f.phone} onChange={set('phone')} placeholder="+34 600 12 34 56" />
          <Field label="Ciudad" value={f.city} onChange={set('city')} placeholder="Valencia" />
        </div>
        <Area label="Lesiones" value={f.injuries} onChange={set('injuries')} />
        <Area label="Patologías y alergias" value={f.pathologies} onChange={set('pathologies')} />
        <Area label="Objetivo principal" value={f.main_goal} onChange={set('main_goal')} />
      </div>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button
        onClick={save}
        disabled={busy}
        style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Guardando…' : 'Guardar ficha'}
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
const labelStyle: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', margin: '12px 0 5px' }

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />
    </label>
  )
}
