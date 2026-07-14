import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, type Profile } from '../../lib/db'
import { getUnreviewedForms, getUpcomingEvents, type UnreviewedForm, type UpcomingEvent } from '../../lib/dashboard'
import { EVENT_TYPES, type EventType } from '../../lib/events'
import { listPendingClaims, markGiftDelivered, milestoneLabel, type PendingClaim } from '../../lib/gifts'
import type { TrainerTab } from './TrainerApp'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

interface Props {
  trainerName: string | null
  onOpenClient: (clientId: string, tab: TrainerTab) => void
}

export default function Resumen({ trainerName, onOpenClient }: Props) {
  const [clients, setClients] = useState<Profile[]>([])
  const [forms, setForms] = useState<UnreviewedForm[]>([])
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [gifts, setGifts] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cs = await listClients()
      setClients(cs)
      const ids = cs.map((c) => c.id)
      const [f, e, g] = await Promise.all([getUnreviewedForms(ids), getUpcomingEvents(ids), listPendingClaims()])
      setForms(f)
      setEvents(e)
      setGifts(g.filter((x) => ids.includes(x.client_id)))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const nameOf = useMemo(() => {
    const m = new Map(clients.map((c) => [c.id, c.full_name || 'Cliente']))
    return (id: string) => m.get(id) ?? 'Cliente'
  }, [clients])

  const avgAdh = clients.length ? Math.round(clients.reduce((s, c) => s + (c.adherence ?? 0), 0) / clients.length) : 0

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Resumen</div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        {trainerName ? `Buen día, ${trainerName.split(' ')[0]}. ` : ''}Esto es lo que pasa con tus clientes.
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <Kpi label="Clientes activos" value={loading ? '…' : String(clients.length)} />
        <Kpi label="Adherencia media" value={loading ? '…' : `${avgAdh}%`} color={adhColor(avgAdh)} />
        <Kpi label="Formularios sin revisar" value={loading ? '…' : String(forms.length)} color={forms.length ? colors.accent : undefined} />
        <Kpi label="Regalos por entregar" value={loading ? '…' : String(gifts.length)} color={gifts.length ? colors.amber : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* formularios sin revisar */}
          <Expandable title="Formularios sin revisar" count={forms.length} defaultOpen>
            {forms.length === 0 ? (
              <Empty>Todo revisado 🎉</Empty>
            ) : (
              forms.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.accent, flex: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{nameOf(f.client_id)}</div>
                    <div style={{ fontSize: 11, color: mut(0.45), marginTop: 1 }}>{f.form_title} · {f.created_at.slice(0, 10)}</div>
                  </div>
                  <button onClick={() => onOpenClient(f.client_id, 'formularios')} style={linkBtn}>Revisar ›</button>
                </div>
              ))
            )}
          </Expandable>

          {/* resumen de clientes */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Clientes · cumplimiento</div>
            {loading ? (
              <Empty>Cargando…</Empty>
            ) : clients.length === 0 ? (
              <Empty>Aún no tienes clientes asignados.</Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {clients.map((c) => (
                  <button key={c.id} onClick={() => onOpenClient(c.id, 'evolucion')} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: colors.text }}>{c.full_name || 'Cliente'}</span>
                    <div style={{ width: 90, height: 6, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${c.adherence ?? 0}%`, height: '100%', background: adhColor(c.adherence ?? 0), borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: adhColor(c.adherence ?? 0), width: 38, textAlign: 'right' }}>{c.adherence ?? 0}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* regalos por entregar */}
          {gifts.length > 0 && (
            <div style={{ ...card, padding: 20, borderColor: 'rgba(245,166,35,0.35)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🎁 Regalos por entregar</div>
              <div style={{ fontSize: 11.5, color: mut(0.5), marginBottom: 14 }}>Un cliente ha reclamado su regalo de fidelidad.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {gifts.map((g) => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.client_name || nameOf(g.client_id)}</div>
                      <div style={{ fontSize: 11, color: colors.amber, marginTop: 1 }}>{milestoneLabel(g.milestone)}</div>
                    </div>
                    <button onClick={() => markGiftDelivered(g.id).then(load)} style={{ ...linkBtn, color: colors.green }}>Entregado ✓</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* próximos eventos */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Próximos eventos</div>
            {loading ? (
              <Empty>Cargando…</Empty>
            ) : events.length === 0 ? (
              <Empty>Sin eventos próximos.</Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {events.map((e) => {
                  const cfg = EVENT_TYPES[e.type as EventType]
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${cfg?.color ?? '#888'}`, paddingLeft: 11 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{nameOf(e.client_id)}</div>
                        <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{e.title || cfg?.label}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: mut(0.6) }}>{e.event_date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: mut(0.5) }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color }}>{value}</div>
    </div>
  )
}

function Expandable({ title, count, defaultOpen, children }: { title: string; count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ ...card, padding: '16px 20px' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ color: mut(0.4), fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, flex: 1, textAlign: 'left' }}>{title}</span>
        {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent, background: 'rgba(219,24,9,0.14)', padding: '2px 9px', borderRadius: 999 }}>{count}</span>}
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: mut(0.4), padding: '4px 0' }}>{children}</div>
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.accent,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  flex: 'none',
}
