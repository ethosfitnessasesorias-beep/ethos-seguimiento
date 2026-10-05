import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addPerimeters,
  addWeight,
  addStep,
  deleteClientPermanently,
  deletePerimeter,
  deleteWeight,
  deleteStep,
  updatePerimeter,
  updateWeight,
  updateStep,
  getProfile,
  listPerimeters,
  listWeights,
  listSteps,
  setClientStatus,
  updateProfile,
  whatsappLink,
  PERIMETER_FIELDS,
  type PerimeterLog,
  type Profile,
  type WeightLog,
  type StepLog,
} from '../../lib/db'
import { changeColor, fullDate, METRIC_OPTIONS, perimeterRows, perimeterSeries, weeklyWeightChanges, weightSeries, stepsSeries } from '../../lib/metrics'
import { getAdherenceStats, type AdherenceStats } from '../../lib/events'
import { compositionSeries } from '../../lib/composition'
import { listSubmissions, setReviewed, deleteSubmission, type FormSubmission } from '../../lib/forms'
import { downloadFormPdf } from '../../lib/formPdf'
import MeasureGuide from '../MeasureGuide'
import { getClientNote, saveClientNote } from '../../lib/notes'
import { giftTimeline, listClaims, removeMilestoneClaim, setGiftNote, setMilestoneDelivered, type GiftClaim, type Milestone } from '../../lib/gifts'
import { addOffer, deleteOffer, listOffers, setOfferLaunched, setOfferNotes, type ClientOffer } from '../../lib/offers'
import { addReminder } from '../../lib/reminders'
import { generateClientReport } from '../../lib/report'
import Modal from '../Modal'
import MetricChart from '../MetricChart'
import Composicion from '../Composicion'
import ProgressPhotos, { type ComparePair } from '../ProgressPhotos'
import ClienteAgenda from './ClienteAgenda'
import ClienteDocumentos from './ClienteDocumentos'
import Checklist from './Checklist'
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
  const [steps, setSteps] = useState<StepLog[]>([])
  const [stats, setStats] = useState<AdherenceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [comparePair, setComparePair] = useState<ComparePair | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getProfile(clientId), listWeights(clientId), listPerimeters(clientId), getAdherenceStats(clientId), listSteps(clientId)])
      .then(([p, w, pr, st, s]) => {
        setProfile(p)
        setWeights(w)
        setPerims(pr)
        setStats(st)
        setSteps(s)
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

      {/* ofertas Grand Slam (el cliente no las ve) */}
      {profile && <OffersManager profile={profile} />}

      {/* ficha del cliente */}
      {profile && <FichaCard p={profile} />}

      {/* sub tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '20px 0 22px', flexWrap: 'wrap' }}>
        {subTab('evolucion', 'Evolución')}
        {subTab('fotos', 'Control fotográfico')}
        {subTab('formularios', 'Formularios')}
        {subTab('agenda', 'Agenda')}
        {subTab('documentos', 'Documentos')}
        {subTab('checklist', 'Checklist')}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4), padding: 20 }}>Cargando datos del cliente…</div>
      ) : tTab === 'evolucion' ? (
        <Evolucion weights={weights} perims={perims} steps={steps} target={target} profile={profile} onChanged={load} />
      ) : tTab === 'fotos' ? (
        <div style={{ ...card, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Control fotográfico</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginBottom: 16 }}>
            Fotos de {name}, organizables en carpetas. Toca 2 para compararlas (se incluye en el informe PDF y puedes descargarla o enviársela). Tú también puedes subir fotos.
          </div>
          <ProgressPhotos clientId={clientId} columns={5} canUpload selectable allowSendToClient onCompareChange={setComparePair} />
        </div>
      ) : tTab === 'formularios' ? (
        <TrainerForms clientId={clientId} clientName={profile?.full_name ?? null} />
      ) : tTab === 'agenda' ? (
        <ClienteAgenda clientId={clientId} />
      ) : tTab === 'checklist' ? (
        <Checklist clientId={clientId} clientPhone={profile?.phone ?? null} goTab={setTTab} />
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
      // Al dar de baja, abre WhatsApp con el mensaje de despedida ya escrito
      // (con las peticiones de reseña). Solo queda pulsar enviar.
      if (active) {
        const first = profile.full_name?.split(' ')[0] || 'Hola'
        const farewell = `${first} lamento mucho que no podamos seguir trabajando juntos, recuerda seguir aplicando todo lo aprendido y sigue cuidándote como ya sabes hacerlo, si en un futuro vuelves a necesitar una mano, aquí estaré para lo que haga falta. Como tarea final, te agradecería muchísimo si nos dejaras una reseñita en trust pilot: https://www.trustpilot.com/review/ethosfitness.es y en google maps: https://g.page/r/CcAVSxAhkVsUEBM/review Esto nos ayuda enormemente a seguir creciendo y pudiendo ayudar a más personas.`
        const link = whatsappLink(profile.phone, farewell)
        if (link) window.open(link, '_blank')
      }
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

function Evolucion({ weights, perims, steps, target, profile, onChanged }: { weights: WeightLog[]; perims: PerimeterLog[]; steps: StepLog[]; target: number | null; profile: Profile | null; onChanged: () => void }) {
  const [metric, setMetric] = useState('weight')
  const [showAll, setShowAll] = useState(false)
  const [addModal, setAddModal] = useState<null | 'weight' | 'perim' | 'steps'>(null)
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
      : metric === 'steps'
        ? stepsSeries(steps)
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
          <button onClick={() => setAddModal('steps')} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Registrar pasos</button>
        </div>

        <button
          onClick={() => setShowAll(true)}
          style={{ marginTop: 12, width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', color: colors.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 10, padding: '11px 0' }}
        >
          📋 Registro de datos métricos
        </button>

        {showAll && (
          <div onClick={() => setShowAll(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 16px', overflowY: 'auto' }} className="om-scroll">
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 980, background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Registro de datos métricos</div>
                <button onClick={() => setShowAll(false)} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, width: 34, height: 34, color: mut(0.7), cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <AllRecords weights={weights} perims={perims} steps={steps} profile={profile} onChanged={onChanged} />
            </div>
          </div>
        )}

        {addModal === 'weight' && profile && (
          <TrainerWeightModal clientId={profile.id} onClose={() => setAddModal(null)} onSaved={() => { setAddModal(null); onChanged() }} />
        )}
        {addModal === 'perim' && profile && (
          <TrainerPerimModal clientId={profile.id} onClose={() => setAddModal(null)} onSaved={() => { setAddModal(null); onChanged() }} />
        )}
        {addModal === 'steps' && profile && (
          <TrainerStepModal clientId={profile.id} onClose={() => setAddModal(null)} onSaved={() => { setAddModal(null); onChanged() }} />
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
        <WeeklyChangeCard weights={weights} />
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Perímetros</div>
          {rows.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginBottom: 6 }}>
                <span style={{ fontSize: 9.5, color: mut(0.35), width: 42, textAlign: 'right' }}>vs ant.</span>
                <span style={{ fontSize: 9.5, color: mut(0.35), width: 54, textAlign: 'right' }}>TOTAL</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rows.map((p) => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 12.5, color: mut(0.75) }}>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.v}<span style={{ fontSize: 9.5, color: mut(0.4) }}> cm</span></span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: p.dColor, width: 42, textAlign: 'right' }}>{p.delta ?? ''}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.totalColor, width: 54, textAlign: 'right' }}>{p.total ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: mut(0.35), marginTop: 9 }}>TOTAL = diferencia desde la primera medición.</div>
            </>
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

// Velocidad de cambio del peso, con el intervalo real (para ajustar la nutrición).
function WeeklyChangeCard({ weights }: { weights: WeightLog[] }) {
  const changes = weeklyWeightChanges(weights).filter((w) => w.deltaKg != null && w.fromDate)
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Velocidad de cambio</div>
      <div style={{ fontSize: 11, color: mut(0.4), marginBottom: 13 }}>Cuánto ha cambiado el peso en cada intervalo</div>
      {changes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: mut(0.4) }}>Necesitas registros en al menos 2 semanas distintas.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...changes].reverse().slice(0, 12).map((w) => {
            const color = changeColor(w.deltaKg ?? 0)
            return (
              <div key={w.weekStart} style={{ paddingBottom: 9, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: mut(0.5), marginBottom: 3 }}>
                  del {fullDate(w.fromDate as string)} al {fullDate(w.date)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color }}>
                    {(w.deltaKg ?? 0) > 0 ? '+' : ''}{w.deltaKg} kg
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color }}>
                    {(w.deltaPct ?? 0) > 0 ? '+' : ''}{w.deltaPct}%
                  </span>
                  <span style={{ fontSize: 11.5, color: mut(0.45), marginLeft: 'auto' }}>{w.weight} kg</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Editar un pesaje ya registrado (valor y/o fecha).
function TrainerEditWeightModal({ clientId, log, onClose, onSaved }: { clientId: string; log: WeightLog; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(String(Number(log.weight)))
  const [date, setDate] = useState(log.log_date.slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = parseFloat(value.replace(',', '.'))
    if (!isFinite(n) || n <= 0) return setErr('Escribe un peso válido.')
    setBusy(true)
    setErr(null)
    try {
      await updateWeight(log.id, clientId, n, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Editar pesaje" onClose={onClose}>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Peso (kg)</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={fieldStyle} autoFocus />
      </label>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
      </label>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </Modal>
  )
}

// Tabla con TODOS los registros (peso, perímetros y composición) por fecha.
function AllRecords({ weights, perims, steps, profile, onChanged }: { weights: WeightLog[]; perims: PerimeterLog[]; steps: StepLog[]; profile: Profile | null; onChanged: () => void }) {
  const [editW, setEditW] = useState<WeightLog | null>(null)
  const [editP, setEditP] = useState<PerimeterLog | null>(null)
  const [editS, setEditS] = useState<StepLog | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportText, setExportText] = useState<string | null>(null)
  const comp = compositionSeries(profile?.sex ?? null, profile?.height_cm ?? null, weights, perims)

  // Índices por fecha.
  const weightByDate = new Map<string, WeightLog>()
  for (const w of weights) weightByDate.set(w.log_date, w)
  const perimByDate = new Map<string, PerimeterLog>()
  for (const p of perims) perimByDate.set(p.log_date, p)
  const stepByDate = new Map<string, StepLog>()
  for (const s of steps) stepByDate.set(s.log_date, s)
  const compByDate = new Map<string, (typeof comp)[number]>()
  for (const c of comp) compByDate.set(c.date, c)

  // Todas las fechas con datos, de la más reciente a la más antigua.
  const dates = Array.from(new Set([...weights.map((w) => w.log_date), ...perims.map((p) => p.log_date), ...steps.map((s) => s.log_date)])).sort((a, b) => (a < b ? 1 : -1))

  if (dates.length === 0) return <div style={{ fontSize: 12.5, color: mut(0.4), marginTop: 12 }}>Sin registros todavía.</div>

  interface RowDef { key: string; label: string; get: (d: string) => number | null; edit?: boolean; perim?: boolean; step?: boolean }
  const rows: RowDef[] = [
    { key: 'weight', label: 'Peso corporal (kg)', get: (d) => (weightByDate.get(d) ? Number(weightByDate.get(d)!.weight) : null), edit: true },
    { key: 'steps', label: 'Pasos (media/día)', get: (d) => (stepByDate.get(d) ? Number(stepByDate.get(d)!.steps) : null), step: true },
    { key: 'fat', label: 'Grasa corporal (%)', get: (d) => compByDate.get(d)?.fatPct ?? null },
    { key: 'muscle', label: 'Músculo (kg)', get: (d) => compByDate.get(d)?.muscleKg ?? null },
    ...PERIMETER_FIELDS.map((f) => ({ key: f.key, label: `${f.label} (cm)`, get: (d: string) => (perimByDate.get(d)?.[f.key] as number | null) ?? null, perim: true })),
  ]

  // Color por cambio (verde sube / rojo baja) respecto a la medición anterior de esa fila.
  const colorFor = (row: RowDef, d: string): string | undefined => {
    const cur = row.get(d)
    if (cur == null) return undefined
    const older = dates.filter((x) => x < d).find((x) => row.get(x) != null)
    const prev = older ? row.get(older) : null
    if (prev == null) return undefined
    return changeColor(+(cur - prev).toFixed(2))
  }

  const removeDate = async (d: string) => {
    if (!profile || !confirm(`¿Eliminar todos los datos del ${fullDate(d)}?`)) return
    const w = weightByDate.get(d)
    const p = perimByDate.get(d)
    const s = stepByDate.get(d)
    if (w) await deleteWeight(w.id, profile.id)
    if (p) await deletePerimeter(p.id)
    if (s) await deleteStep(s.id)
    onChanged()
  }

  // Exporta la tabla como texto para pegarlo en Claude (solo lo ve el entrenador).
  const buildExport = (): string => {
    const asc = [...dates].sort()
    const head = ['Fecha', ...rows.filter((r) => asc.some((d) => r.get(d) != null)).map((r) => r.label)]
    const used = rows.filter((r) => asc.some((d) => r.get(d) != null))
    const lines = [
      `Métricas de ${profile?.full_name || 'cliente'}${profile?.sex ? ` (${profile.sex === 'female' ? 'mujer' : 'hombre'}` : ''}${profile?.height_cm ? `, ${profile.height_cm} cm` : ''}${profile?.sex || profile?.height_cm ? ')' : ''}`,
      `Exportado el ${fullDate(new Date().toISOString().slice(0, 10))} · ${asc.length} fechas`,
      '',
      head.join(' | '),
      head.map(() => '---').join(' | '),
      ...asc.map((d) => [d, ...used.map((r) => (r.get(d) != null ? String(r.get(d)) : ''))].join(' | ')),
    ]
    return lines.join('\n')
  }

  const exportData = async () => {
    const text = buildExport()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Si el navegador bloquea el portapapeles, se muestra el texto para copiarlo a mano.
      setExportText(text)
    }
  }

  const labelCell: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: mut(0.75), textAlign: 'left', padding: '9px 12px', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: colors.surface1, borderBottom: '1px solid rgba(255,255,255,0.05)' }
  const cellStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, textAlign: 'center', padding: '9px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }
  const headCell: React.CSSProperties = { padding: '8px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.09)' }

  return (
    <div style={{ marginTop: 12 }}>
      {/* exportar para pegar en Claude */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <button
          onClick={exportData}
          style={{ background: copied ? 'rgba(74,222,128,0.14)' : colors.surface2, color: copied ? colors.green : colors.text, border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          {copied ? '✓ Copiado al portapapeles' : '📋 Exportar datos (copiar para Claude)'}
        </button>
        <span style={{ fontSize: 11, color: mut(0.4) }}>Copia toda la tabla como texto para pegarla en tu proyecto de Claude.</span>
      </div>

      {exportText && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, color: colors.amber, marginBottom: 5 }}>Copia este texto a mano (tu navegador no permitió el copiado automático):</div>
          <textarea
            readOnly
            value={exportText}
            onFocus={(e) => e.currentTarget.select()}
            style={{ width: '100%', height: 150, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, color: colors.text, fontFamily: 'monospace', fontSize: 11, outline: 'none' }}
          />
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }} className="om-scroll">
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...labelCell, ...headCell, zIndex: 2 }}>Métrica</th>
              {dates.map((d) => (
                <th key={d} style={{ ...headCell, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>{fullDate(d)}</div>
                  {profile && (
                    <button onClick={() => removeDate(d)} title="Eliminar esta fecha" style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 12, marginTop: 2, fontFamily: 'inherit' }}>🗑</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (dates.every((d) => row.get(d) == null)) return null
              return (
                <tr key={row.key}>
                  <td style={labelCell}>{row.label}</td>
                  {dates.map((d) => {
                    const v = row.get(d)
                    const wLog = weightByDate.get(d)
                    const pLog = perimByDate.get(d)
                    const sLog = stepByDate.get(d)
                    const onEdit = row.edit && wLog ? () => setEditW(wLog) : row.perim && pLog ? () => setEditP(pLog) : row.step && sLog ? () => setEditS(sLog) : undefined
                    return (
                      <td
                        key={d}
                        onClick={onEdit}
                        title={onEdit ? 'Editar' : undefined}
                        style={{ ...cellStyle, color: v != null ? (colorFor(row, d) ?? colors.text) : mut(0.25), cursor: onEdit ? 'pointer' : 'default' }}
                      >
                        {v != null ? v : '·'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10.5, color: mut(0.35), marginTop: 8, lineHeight: 1.5 }}>
        Desliza en horizontal para ver más fechas. Toca un valor de <b>peso</b>, <b>pasos</b> o <b>perímetro</b> para editarlo. 🗑 elimina todos los datos de esa fecha. Verde = sube · rojo = baja.
      </div>

      {editW && profile && (
        <TrainerEditWeightModal clientId={profile.id} log={editW} onClose={() => setEditW(null)} onSaved={() => { setEditW(null); onChanged() }} />
      )}
      {editP && (
        <TrainerEditPerimModal log={editP} onClose={() => setEditP(null)} onSaved={() => { setEditP(null); onChanged() }} />
      )}
      {editS && (
        <TrainerEditStepModal log={editS} onClose={() => setEditS(null)} onSaved={() => { setEditS(null); onChanged() }} />
      )}
    </div>
  )
}

// Editar un registro de perímetros (todos los valores + fecha).
function TrainerEditPerimModal({ log, onClose, onSaved }: { log: PerimeterLog; onClose: () => void; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PERIMETER_FIELDS) {
      const v = log[f.key] as number | null
      init[f.key] = v != null ? String(v) : ''
    }
    return init
  })
  const [date, setDate] = useState(log.log_date.slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const payload: Record<string, number | null> = {}
    for (const f of PERIMETER_FIELDS) {
      const raw = vals[f.key]?.trim()
      if (!raw) payload[f.key] = null
      else {
        const n = parseFloat(raw.replace(',', '.'))
        payload[f.key] = isFinite(n) ? n : null
      }
    }
    setBusy(true)
    setErr(null)
    try {
      await updatePerimeter(log.id, payload, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Editar perímetros" onClose={onClose}>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={labelStyle}>Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
      </label>
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
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </Modal>
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
function TrainerForms({ clientId, clientName }: { clientId: string; clientName: string | null }) {
  const [subs, setSubs] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'reviewed'>('all')

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
  const remove = async (s: FormSubmission) => {
    if (!confirm(`¿Eliminar este envío de «${s.form_title}» del ${s.created_at.slice(0, 10)}? No se puede deshacer.`)) return
    await deleteSubmission(s.id)
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

  // Tipos presentes (para el filtro), sin repetir.
  const types = Array.from(new Map(subs.map((s) => [s.form_type, s.form_title])).entries())
  const filtered = subs.filter((s) => {
    if (typeFilter !== 'all' && s.form_type !== typeFilter) return false
    if (reviewFilter === 'pending' && s.reviewed) return false
    if (reviewFilter === 'reviewed' && !s.reviewed) return false
    return true
  })

  const selStyle: React.CSSProperties = { background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '7px 10px', fontFamily: 'inherit', fontSize: 12.5, outline: 'none' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selStyle}>
          <option value="all">Todos los tipos</option>
          {types.map(([type, title]) => (
            <option key={type} value={type}>{title}</option>
          ))}
        </select>
        <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as 'all' | 'pending' | 'reviewed')} style={selStyle}>
          <option value="all">Revisados y sin revisar</option>
          <option value="pending">Solo sin revisar</option>
          <option value="reviewed">Solo revisados</option>
        </select>
        <span style={{ fontSize: 12, color: mut(0.45), marginLeft: 'auto' }}>{filtered.length} de {subs.length}</span>
      </div>
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: '24px', textAlign: 'center', fontSize: 13, color: mut(0.45) }}>Ningún formulario con ese filtro.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((f) => (
            <FormAccordion key={f.id} f={f} clientName={clientName} onToggleReviewed={() => toggle(f)} onDelete={() => remove(f)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FormAccordion({ f, clientName, onToggleReviewed, onDelete }: { f: FormSubmission; clientName: string | null; onToggleReviewed: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  return (
    <div style={{ ...card, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
          <span style={{ color: mut(0.4), fontSize: 12, width: 14 }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{f.form_title}</span>
          <span style={{ fontSize: 11, color: mut(0.45) }}>{f.created_at.slice(0, 10)}</span>
        </button>
        <button
          onClick={async () => {
            setPdfBusy(true)
            try {
              await downloadFormPdf(f, clientName)
            } finally {
              setPdfBusy(false)
            }
          }}
          title="Descargar en PDF (para adjuntar a Claude)"
          style={{ fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: '#f5a99f', background: 'rgba(219,24,9,0.14)', border: 'none', padding: '4px 11px', borderRadius: 999, fontFamily: 'inherit', flex: 'none' }}
        >
          {pdfBusy ? '…' : '↓ PDF'}
        </button>
        <button
          onClick={onToggleReviewed}
          style={{ fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: f.reviewed ? colors.green : colors.accent, background: f.reviewed ? 'rgba(74,222,128,0.12)' : 'rgba(219,24,9,0.14)', border: 'none', padding: '4px 11px', borderRadius: 999, fontFamily: 'inherit', flex: 'none' }}
        >
          {f.reviewed ? '✓ Revisado' : 'Marcar revisado'}
        </button>
        <button
          onClick={onDelete}
          title="Eliminar este envío"
          style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', color: mut(0.5), background: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 9px', borderRadius: 999, fontFamily: 'inherit', flex: 'none' }}
        >
          🗑
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

  const toggle = async (key: Milestone, delivered: boolean) => {
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
            const claim = claims.find((c) => c.milestone === s.key)
            return (
              <div key={s.key} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                {claim && (
                  <input
                    defaultValue={claim.gift_note ?? ''}
                    onBlur={(e) => setGiftNote(claim.id, e.target.value).then(load).catch(() => {})}
                    placeholder="¿Qué le compraste o enviaste? (straps, shaker, descuento…)"
                    style={{ width: '100%', marginTop: 7, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Ofertas Grand Slam (solo entrenador; el cliente no las ve) ----------
const QUICK_OFFERS = ['Grand Slam · mes 1-3', 'Grand Slam · mes 3-6', 'Grand Slam · fin de servicio', 'Oferta época señalada']

// Meses completos desde una fecha ISO hasta hoy.
function monthsSince(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const now = new Date()
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1
  return Math.max(0, months)
}

function OffersManager({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [offers, setOffers] = useState<ClientOffer[]>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [remindDate, setRemindDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => {
    listOffers(profile.id).then(setOffers).catch(() => {})
  }
  useEffect(load, [profile.id])

  const months = monthsSince(profile.start_date)
  const plan = (profile.plan || '').toLowerCase()
  const hint = plan.includes('anual')
    ? 'Plan anual → Grand Slam a los 3-6 meses o al finalizar el servicio.'
    : plan.includes('trimes') || plan.includes('semes')
      ? 'Plan trimestral/semestral → Grand Slam a los 1-3 meses (según su progreso).'
      : 'Trimestral/semestral → GS al mes 1-3 · Anual → mes 3-6 o al finalizar · + épocas señaladas.'

  const launched = offers.filter((o) => o.launched).length

  const add = async () => {
    if (!title.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      await addOffer(profile.id, title, notes)
      if (remindDate) {
        await addReminder(profile.id, remindDate, `Lanzar oferta a ${profile.full_name || 'este cliente'}: ${title.trim()}`)
        setMsg('Oferta guardada · aviso programado (te llegará por email ese día) ✓')
      } else {
        setMsg('Oferta guardada ✓')
      }
      setTitle('')
      setNotes('')
      setRemindDate('')
      load()
    } catch {
      setMsg('No se pudo guardar la oferta.')
    } finally {
      setBusy(false)
    }
  }

  const toggleLaunched = async (o: ClientOffer) => {
    try {
      await setOfferLaunched(o.id, !o.launched)
      load()
    } catch {
      /* recarga en la próxima */
    }
  }

  const remove = async (o: ClientOffer) => {
    if (!confirm(`¿Eliminar la oferta «${o.title}»?`)) return
    await deleteOffer(o.id)
    load()
  }

  const offerNoteInput: React.CSSProperties = { width: '100%', marginTop: 7, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }

  return (
    <div style={{ ...card, padding: '14px 20px', marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>🎯 Ofertas Grand Slam</span>
        <span style={{ fontSize: 10.5, color: offers.length && launched < offers.length ? colors.amber : mut(0.4) }}>
          {offers.length === 0 ? 'sin ofertas' : `${launched}/${offers.length} lanzadas`}
          {months != null ? ` · lleva ${months} ${months === 1 ? 'mes' : 'meses'}` : ''}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: mut(0.5), background: colors.surface2, borderRadius: 9, padding: '8px 11px', lineHeight: 1.5, marginBottom: 10 }}>
            💡 {hint} El cliente <b>no ve</b> esta sección.
          </div>

          {/* ofertas existentes */}
          {offers.map((o) => (
            <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => toggleLaunched(o)}
                  title={o.launched ? 'Marcar como no lanzada' : 'Marcar como lanzada'}
                  style={{ width: 21, height: 21, flex: 'none', borderRadius: 6, border: `1.5px solid ${o.launched ? colors.green : 'rgba(255,255,255,0.25)'}`, background: o.launched ? colors.green : 'transparent', color: '#062', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, padding: 0 }}
                >
                  {o.launched ? '✓' : ''}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: o.launched ? mut(0.55) : colors.text }}>{o.title}</div>
                  <div style={{ fontSize: 10.5, color: o.launched ? colors.green : colors.amber, marginTop: 1 }}>
                    {o.launched ? `Lanzada el ${o.launched_at ?? ''}` : 'Pendiente de lanzar'}
                  </div>
                </div>
                <button onClick={() => remove(o)} title="Eliminar oferta" style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
              <input
                defaultValue={o.notes ?? ''}
                onBlur={(e) => setOfferNotes(o.id, e.target.value).then(load).catch(() => {})}
                placeholder="¿Qué se le ha propuesto exactamente? (oferta, precio, condiciones…)"
                style={offerNoteInput}
              />
            </div>
          ))}

          {/* añadir oferta */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {QUICK_OFFERS.map((q) => (
                <button key={q} onClick={() => setTitle(q)} style={{ background: title === q ? 'rgba(219,24,9,0.16)' : colors.surface2, color: title === q ? colors.text : mut(0.55), border: `1px solid ${title === q ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 999, padding: '5px 11px', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  {q}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la oferta (ej: Grand Slam mes 3 · upgrade anual)" style={{ ...offerNoteInput, marginTop: 0 }} />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas: qué le vas a proponer (opcional)" style={offerNoteInput} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: mut(0.55) }}>
                Avisarme el
                <input type="date" value={remindDate} onChange={(e) => setRemindDate(e.target.value)} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 9px', color: colors.text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
              </label>
              <button onClick={add} disabled={busy || !title.trim()} style={{ marginLeft: 'auto', background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: busy || !title.trim() ? 0.5 : 1 }}>
                + Añadir oferta
              </button>
            </div>
            {msg && <div style={{ fontSize: 11.5, color: msg.includes('✓') ? colors.green : '#f5a99f', marginTop: 8 }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Modales: el entrenador registra métricas del cliente ----------
function TrainerStepModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = Math.round(parseFloat(value.replace(/[.\s]/g, '').replace(',', '.')))
    if (!isFinite(n) || n <= 0) return setErr('Escribe un número de pasos válido.')
    setBusy(true)
    setErr(null)
    try {
      await addStep(clientId, n, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar media de pasos" onClose={onClose}>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Pasos por día</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" placeholder="8500" style={fieldStyle} autoFocus />
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

function TrainerEditStepModal({ log, onClose, onSaved }: { log: StepLog; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(String(Number(log.steps)))
  const [date, setDate] = useState(log.log_date.slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const n = Math.round(parseFloat(value.replace(/[.\s]/g, '').replace(',', '.')))
    if (!isFinite(n) || n <= 0) return setErr('Escribe un número de pasos válido.')
    setBusy(true)
    setErr(null)
    try {
      await updateStep(log.id, n, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Editar media de pasos" onClose={onClose}>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Pasos por día</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" style={fieldStyle} autoFocus />
      </label>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
      </label>
      {err && <div style={{ fontSize: 12, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </Modal>
  )
}

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
  const [date, setDate] = useState('')
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
      await addPerimeters(clientId, payload, date || undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar perímetros del cliente" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: colors.surface2, borderRadius: 10, padding: '9px 12px' }}>
        <MeasureGuide />
        <span style={{ fontSize: 12, color: mut(0.6), lineHeight: 1.4 }}>Guía de por dónde tomar cada medida.</span>
      </div>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={labelStyle}>Fecha (opcional, por defecto hoy)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
      </label>
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
    birth_date: profile.birth_date ?? '',
    pay_amount: profile.pay_amount != null ? String(profile.pay_amount) : '',
    pay_every_months: profile.pay_every_months != null ? String(profile.pay_every_months) : '',
    pay_next_date: profile.pay_next_date ?? '',
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
        birth_date: txt(f.birth_date),
        pay_amount: num(f.pay_amount),
        pay_every_months: num(f.pay_every_months),
        pay_next_date: txt(f.pay_next_date),
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Fecha de inicio (cliente desde)</span>
            <input type="date" value={f.start_date.slice(0, 10)} onChange={(e) => set('start_date')(e.target.value)} style={fieldStyle} />
          </label>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Fecha de nacimiento</span>
            <input type="date" value={f.birth_date.slice(0, 10)} onChange={(e) => set('birth_date')(e.target.value)} style={fieldStyle} />
          </label>
        </div>
        <span style={{ fontSize: 10.5, color: mut(0.4), display: 'block', marginTop: 4 }}>La fecha de inicio calcula los regalos y el aniversario; la de nacimiento, el mensaje de cumpleaños.</span>

        <div style={{ fontSize: 12, fontWeight: 700, margin: '14px 0 6px' }}>💶 Cobro</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Importe (€)" value={f.pay_amount} onChange={set('pay_amount')} placeholder="150" />
          <Field label="Cada (meses)" value={f.pay_every_months} onChange={set('pay_every_months')} placeholder="1" />
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Próximo cobro</span>
            <input type="date" value={f.pay_next_date.slice(0, 10)} onChange={(e) => set('pay_next_date')(e.target.value)} style={fieldStyle} />
          </label>
        </div>
        <span style={{ fontSize: 10.5, color: mut(0.4), display: 'block', marginTop: 4 }}>Aparece en Resumen → «Próximos cobros». Al marcar «Cobrado ✓» pasa solo a la siguiente fecha.</span>

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
