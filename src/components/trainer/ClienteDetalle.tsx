import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addPerimeters,
  addWeight,
  deleteClientPermanently,
  deletePerimeter,
  deleteWeight,
  getProfile,
  listPerimeters,
  listWeights,
  setClientStatus,
  updateProfile,
  PERIMETER_FIELDS,
  type PerimeterLog,
  type Profile,
  type WeightLog,
} from '../../lib/db'
import { METRIC_OPTIONS, perimeterRows, perimeterSeries, shortDate, weightSeries } from '../../lib/metrics'
import { getAdherenceStats, type AdherenceStats } from '../../lib/events'
import { compositionSeries } from '../../lib/composition'
import { listSubmissions, setReviewed, type FormSubmission } from '../../lib/forms'
import { getClientNote, saveClientNote } from '../../lib/notes'
import { giftTimeline, listClaims, removeMilestoneClaim, setMilestoneDelivered, type GiftClaim } from '../../lib/gifts'
import { generateClientReport } from '../../lib/report'
import Modal from '../Modal'
import MetricChart from '../MetricChart'
import Composicion from '../Composicion'
import ProgressPhotos, { type ComparePair } from '../ProgressPhotos'
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

const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

export default function ClienteDetalle({ clientId, tTab, setTTab, goClientes }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [perims, setPerims] = useState<PerimeterLog[]>([])
  const [stats, setStats] = useState<AdherenceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [comparePair, setComparePair] = useState<ComparePair | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getProfile(clientId), listWeights(clientId), listPerimeters(clientId), getAdherenceStats(clientId)])
      .then(([p, w, pr, st]) => {
        setProfile(p)
        setWeights(w)
        setPerims(pr)
        setStats(st)
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
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <HeaderStat label="Peso actual" value={current != null ? String(current) : '—'} />
          <HeaderStat label="Objetivo" value={target != null ? String(target) : '—'} color={colors.accent} />
          <HeaderStat label="Cumpl. semana" value={`${stats?.weekPct ?? 0}%`} color={adhColor(stats?.weekPct ?? 0)} />
          <HeaderStat label="Cumpl. plan" value={`${stats?.planPct ?? 0}%`} color={adhColor(stats?.planPct ?? 0)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setEditing(true)}
              style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '9px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Editar ficha
            </button>
            <button
              onClick={() => profile && generateClientReport(profile, weights, perims, stats, comparePair)}
              style={{ background: 'rgba(219,24,9,0.12)', color: '#f5a99f', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 11, padding: '9px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ↓ Informe PDF
            </button>
          </div>
        </div>
      </div>

      {/* estado del contrato */}
      {profile && (
        <div style={{ fontSize: 11.5, color: profile.contract_signed_at ? colors.green : colors.amber, margin: '0 2px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {profile.contract_signed_at
            ? `✓ Contrato firmado por ${profile.contract_signature_name || name} el ${profile.contract_signed_at.slice(0, 10)}`
            : '⚠ Contrato pendiente de firma — el cliente no puede usar la app hasta firmarlo.'}
        </div>
      )}

      {/* alta / baja / eliminación */}
      {profile && <ClientLifecycle profile={profile} onChanged={load} goClientes={goClientes} />}

      {/* notas privadas del entrenador */}
      <PrivateNotes clientId={clientId} />

      {/* regalos de fidelidad (gestión) */}
      {profile && <GiftsManager profile={profile} />}

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
        <Evolucion weights={weights} perims={perims} target={target} profile={profile} onChanged={load} />
      ) : tTab === 'fotos' ? (
        <div style={{ ...card, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Control fotográfico</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginBottom: 16 }}>
            Fotos de {name}. Toca 2 para compararlas; esa comparativa se incluirá en el informe PDF. Tú también puedes subir fotos.
          </div>
          <ProgressPhotos clientId={clientId} columns={4} canUpload selectable onCompareChange={setComparePair} />
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

// Gestión del cliente: dar de baja (conserva datos), reactivar o eliminar.
function ClientLifecycle({ profile, onChanged, goClientes }: { profile: Profile; onChanged: () => void; goClientes: () => void }) {
  const active = (profile.status ?? 'active') === 'active'
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delText, setDelText] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const toggle = async () => {
    setBusy(true)
    setErr(null)
    try {
      await setClientStatus(profile.id, active ? 'inactive' : 'active')
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo cambiar el estado.')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    setBusy(true)
    setErr(null)
    try {
      await deleteClientPermanently(profile.id)
      goClientes()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
      setBusy(false)
    }
  }

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12, borderColor: active ? card.border as string : 'rgba(245,166,35,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {active ? 'Cliente activo' : 'Cliente dado de baja'}
            {!active && <span style={{ fontSize: 10.5, color: colors.amber, marginLeft: 8, fontWeight: 600 }}>· no cuenta en tus estadísticas</span>}
          </div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>
            {active
              ? 'Al dar de baja se conserva TODO su historial. Podrás reactivarlo cuando vuelva.'
              : profile.deactivated_at
                ? `De baja desde el ${profile.deactivated_at.slice(0, 10)}. Sus datos siguen guardados.`
                : 'Sus datos siguen guardados.'}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          style={{ background: active ? colors.surface2 : 'rgba(74,222,128,0.14)', color: active ? colors.amber : colors.green, border: `1px solid ${active ? 'rgba(245,166,35,0.35)' : 'rgba(74,222,128,0.4)'}`, borderRadius: 10, padding: '9px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {active ? 'Dar de baja' : '↩ Reactivar'}
        </button>
        <button
          onClick={() => { setConfirmDel(true); setDelText(''); setErr(null) }}
          disabled={busy}
          style={{ background: 'none', color: mut(0.45), border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Eliminar…
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}

      {confirmDel && (
        <Modal title="Eliminar cliente definitivamente" onClose={() => setConfirmDel(false)}>
          <div style={{ fontSize: 13, color: mut(0.7), lineHeight: 1.6, marginBottom: 14 }}>
            Esto borra <b style={{ color: '#f5a99f' }}>para siempre</b> la cuenta de <b>{profile.full_name || 'este cliente'}</b> y todos sus datos (métricas, fotos, formularios, documentos, contrato). <b>No se puede deshacer.</b>
            <br /><br />
            Si solo se va temporalmente, usa <b style={{ color: colors.amber }}>«Dar de baja»</b> en su lugar y conservarás todo.
          </div>
          <div style={{ fontSize: 11.5, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>Escribe ELIMINAR para confirmar</div>
          <input
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            placeholder="ELIMINAR"
            style={{ ...fieldStyle, marginBottom: 14 }}
          />
          {err && <div style={{ fontSize: 12, color: '#f5a99f', marginBottom: 10 }}>{err}</div>}
          <button
            onClick={del}
            disabled={busy || delText.trim().toUpperCase() !== 'ELIMINAR'}
            style={{ width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy || delText.trim().toUpperCase() !== 'ELIMINAR' ? 0.5 : 1 }}
          >
            {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// Notas privadas del entrenador (el cliente no las ve).
function PrivateNotes({ clientId }: { clientId: string }) {
  const [body, setBody] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoaded(false)
    getClientNote(clientId)
      .then((b) => {
        setBody(b)
        setOpen(!!b)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [clientId])

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      await saveClientNote(clientId, body)
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>🔒 Notas privadas</span>
        <span style={{ fontSize: 10.5, color: mut(0.4) }}>solo tú las ves</span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setSaved(false)
            }}
            placeholder={loaded ? 'Lesiones, preferencias, acuerdos, recordatorios sobre este cliente…' : 'Cargando…'}
            rows={4}
            style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button onClick={save} disabled={busy} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '…' : 'Guardar nota'}
            </button>
            {saved && <span style={{ fontSize: 12, color: colors.green }}>Guardado ✓</span>}
          </div>
        </div>
      )}
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

function Evolucion({ weights, perims, target, profile, onChanged }: { weights: WeightLog[]; perims: PerimeterLog[]; target: number | null; profile: Profile | null; onChanged: () => void }) {
  const [metric, setMetric] = useState('weight')
  const [showAll, setShowAll] = useState(false)
  const [addModal, setAddModal] = useState<null | 'weight' | 'perim'>(null)
  const rows = perimeterRows(perims)
  const first = weights.length ? Number(weights[0].weight) : null
  const current = weights.length ? Number(weights[weights.length - 1].weight) : null
  const progress = first != null && current != null ? +(current - first).toFixed(1) : null
  const pct =
    first != null && current != null && target != null && first !== target
      ? Math.max(0, Math.min(100, Math.round(((first - current) / (first - target)) * 100)))
      : null

  const COMP_METRICS = [
    { key: 'fatPct', label: 'Grasa %', unit: '%', color: '#f5a623' },
    { key: 'muscleKg', label: 'Músculo kg', unit: 'kg', color: '#db1809' },
    { key: 'boneKg', label: 'Óseo kg', unit: 'kg', color: '#2dd4bf' },
  ]
  const allOptions = [...METRIC_OPTIONS, ...COMP_METRICS]
  const opt = allOptions.find((m) => m.key === metric) ?? allOptions[0]
  const compSeries = compositionSeries(profile?.sex ?? null, profile?.height_cm ?? null, weights, perims)
  const isComp = COMP_METRICS.some((c) => c.key === metric)
  const series = isComp
    ? compSeries.map((c) => ({ date: c.date, value: c[metric as 'fatPct' | 'muscleKg' | 'boneKg'] }))
    : metric === 'weight'
      ? weightSeries(weights)
      : perimeterSeries(perims, metric)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Evolución · {opt.label}</div>
            <div style={{ fontSize: 11, color: mut(0.4), marginTop: 2 }}>{opt.unit} · registrado por el cliente</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allOptions.map((m) => {
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

        {/* el entrenador también puede registrar métricas del cliente */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setAddModal('weight')} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Registrar peso</button>
          <button onClick={() => setAddModal('perim')} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Registrar perímetros</button>
        </div>

        <button
          onClick={() => setShowAll((s) => !s)}
          style={{ marginTop: 12, background: 'none', border: 'none', color: colors.accent, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {showAll ? '▾ Ocultar todos los registros' : '▸ Ver todos los registros'}
        </button>
        {showAll && <AllRecords weights={weights} perims={perims} profile={profile} onChanged={onChanged} />}

        {addModal === 'weight' && profile && (
          <TrainerWeightModal clientId={profile.id} onClose={() => setAddModal(null)} onSaved={() => { setAddModal(null); onChanged() }} />
        )}
        {addModal === 'perim' && profile && (
          <TrainerPerimModal clientId={profile.id} onClose={() => setAddModal(null)} onSaved={() => { setAddModal(null); onChanged() }} />
        )}
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
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Composición corporal</div>
          <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 14 }}>Estimada según peso y perímetros</div>
          <Composicion
            sex={profile?.sex ?? null}
            heightCm={profile?.height_cm ?? null}
            weight={weights.length ? Number(weights[weights.length - 1].weight) : null}
            perim={perims[perims.length - 1] ?? null}
          />
        </div>
      </div>
    </div>
  )
}

// Tabla con TODOS los registros (peso, perímetros y composición) por fecha.
function AllRecords({ weights, perims, profile, onChanged }: { weights: WeightLog[]; perims: PerimeterLog[]; profile: Profile | null; onChanged: () => void }) {
  const comp = compositionSeries(profile?.sex ?? null, profile?.height_cm ?? null, weights, perims)
  const th: React.CSSProperties = { fontSize: 10.5, color: mut(0.4), fontWeight: 600, textAlign: 'right', padding: '6px 8px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { fontSize: 12, textAlign: 'right', padding: '7px 8px', whiteSpace: 'nowrap' }
  const wDesc = [...weights].reverse()
  const pDesc = [...perims].reverse()

  const removeWeight = async (id: string) => {
    if (!profile || !confirm('¿Eliminar este registro de peso del cliente?')) return
    await deleteWeight(id, profile.id)
    onChanged()
  }
  const removePerim = async (id: string) => {
    if (!confirm('¿Eliminar este registro de perímetros del cliente?')) return
    await deletePerimeter(id)
    onChanged()
  }
  const delBtn: React.CSSProperties = { background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 13, padding: '2px 4px', lineHeight: 1, flex: 'none' }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Peso corporal</div>
        {wDesc.length === 0 ? (
          <div style={{ fontSize: 12, color: mut(0.4) }}>Sin registros.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wDesc.map((w) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                <span style={{ color: mut(0.6) }}>{shortDate(w.log_date)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600 }}>{Number(w.weight)} kg</span>
                  <button onClick={() => removeWeight(w.id)} title="Eliminar" style={delBtn}>✕</button>
                </div>
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
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {pDesc.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ ...td, textAlign: 'left', color: mut(0.6) }}>{shortDate(p.log_date)}</td>
                  {PERIMETER_FIELDS.map((f) => (
                    <td key={f.key} style={td}>{(p[f.key] as number | null) ?? '—'}</td>
                  ))}
                  <td style={td}><button onClick={() => removePerim(p.id)} title="Eliminar" style={delBtn}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ overflowX: 'auto' }} className="om-scroll">
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Composición corporal (estimada)</div>
        {comp.length === 0 ? (
          <div style={{ fontSize: 12, color: mut(0.4) }}>
            Sin datos suficientes (requiere sexo y altura en la ficha, y registros con cintura y cuello).
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Fecha</th>
                <th style={th}>Grasa %</th>
                <th style={th}>Grasa kg</th>
                <th style={th}>Músculo %</th>
                <th style={th}>Músculo kg</th>
                <th style={th}>Óseo %</th>
                <th style={th}>Óseo kg</th>
              </tr>
            </thead>
            <tbody>
              {[...comp].reverse().map((c) => (
                <tr key={c.date} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ ...td, textAlign: 'left', color: mut(0.6) }}>{shortDate(c.date)}</td>
                  <td style={td}>{c.fatPct}</td>
                  <td style={td}>{c.fatKg}</td>
                  <td style={td}>{c.musclePct}</td>
                  <td style={td}>{c.muscleKg}</td>
                  <td style={td}>{c.bonePct}</td>
                  <td style={td}>{c.boneKg}</td>
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

// ---------- Gestión de regalos de fidelidad (entrenador) ----------
function GiftsManager({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<GiftClaim[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const startISO = profile.start_date ?? profile.created_at

  const load = () => {
    listClaims(profile.id).then(setClaims).catch(() => {})
  }
  useEffect(load, [profile.id])

  const steps = giftTimeline(startISO, claims)

  const toggle = async (key: 'welcome' | '6m' | '12m', delivered: boolean) => {
    setBusy(true)
    try {
      if (delivered) await setMilestoneDelivered(profile.id, key)
      else await removeMilestoneClaim(profile.id, key)
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>🎁 Regalos de fidelidad</span>
        <span style={{ fontSize: 10.5, color: mut(0.4) }}>{profile.start_date ? `desde ${profile.start_date}` : 'sin fecha de inicio'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!profile.start_date && (
            <div style={{ fontSize: 11.5, color: colors.amber, marginBottom: 4 }}>
              Pon la <b>fecha de inicio</b> del cliente en «Editar ficha» para que el cronograma sea correcto.
            </div>
          )}
          {steps.map((s) => {
            const done = s.status === 'delivered' || s.status === 'claimed'
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 1 }}>
                    {s.date.toLocaleDateString('es-ES')} · {s.status === 'delivered' ? 'entregado' : s.status === 'claimed' ? 'reclamado (pendiente de entregar)' : s.status === 'available' ? 'disponible' : `en ${s.daysRemaining} días`}
                  </div>
                </div>
                <button
                  onClick={() => toggle(s.key, !done)}
                  disabled={busy}
                  style={{ background: done ? colors.surface2 : 'rgba(74,222,128,0.14)', color: done ? mut(0.6) : colors.green, border: `1px solid ${done ? 'rgba(255,255,255,0.12)' : 'rgba(74,222,128,0.4)'}`, borderRadius: 9, padding: '7px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {done ? 'Marcar pendiente' : 'Marcar entregado'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Modales: el entrenador registra métricas del cliente ----------
function TrainerWeightModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = parseFloat(value.replace(',', '.'))
    if (!isFinite(n) || n <= 0) return setErr('Escribe un peso válido.')
    setBusy(true)
    setErr(null)
    try {
      await addWeight(clientId, n, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar peso del cliente" onClose={onClose}>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Peso (kg)</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="83.6" style={fieldStyle} autoFocus />
      </label>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Fecha (opcional, por defecto hoy)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
      </label>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
  )
}

function TrainerPerimModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({})
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
    if (Object.keys(payload).length === 0) return setErr('Rellena al menos un perímetro.')
    setBusy(true)
    setErr(null)
    try {
      await addPerimeters(clientId, payload)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar perímetros del cliente" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {PERIMETER_FIELDS.map((f) => (
          <label key={f.key} style={{ display: 'block' }}>
            <span style={labelStyle}>{f.label} (cm)</span>
            <input value={vals[f.key] ?? ''} onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))} inputMode="decimal" style={fieldStyle} />
          </label>
        ))}
      </div>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
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
    start_date: profile.start_date ?? '',
    injuries: profile.injuries ?? '',
    pathologies: profile.pathologies ?? '',
    main_goal: profile.main_goal ?? '',
  })
  const [sex, setSex] = useState<string | null>(profile.sex ?? null)
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
        sex,
        height_cm: num(f.height_cm),
        target_weight: num(f.target_weight),
        phone: txt(f.phone),
        city: txt(f.city),
        start_date: txt(f.start_date),
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
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Sexo (para calcular la composición corporal)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ k: 'male', l: 'Hombre' }, { k: 'female', l: 'Mujer' }].map((o) => (
              <button
                key={o.k}
                onClick={() => setSex(o.k)}
                style={{ flex: 1, background: sex === o.k ? 'rgba(219,24,9,0.14)' : colors.surface2, color: sex === o.k ? colors.text : mut(0.6), border: `1px solid ${sex === o.k ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '11px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Fecha de inicio (cliente desde)</span>
          <input type="date" value={f.start_date.slice(0, 10)} onChange={(e) => set('start_date')(e.target.value)} style={fieldStyle} />
          <span style={{ fontSize: 10.5, color: mut(0.4), display: 'block', marginTop: 4 }}>Desde esta fecha se calculan los regalos de fidelidad (6 y 12 meses).</span>
        </label>
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
