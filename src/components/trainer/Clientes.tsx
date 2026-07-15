import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, setClientStatus, type Profile } from '../../lib/db'
import { createInvite, deleteInvite, inviteLink, inviteMailto, listInvites, type Invite } from '../../lib/invites'
import Modal from '../Modal'
import { Search, Chevron } from '../icons'

interface Props {
  onOpen: (id: string) => void
}

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

export default function Clientes({ onOpen }: Props) {
  const [clients, setClients] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tab, setTab] = useState<'active' | 'inactive'>('active')

  const reload = useCallback(() => {
    Promise.all([listClients('all'), listInvites().catch(() => [] as Invite[])])
      .then(([c, i]) => {
        setClients(c)
        setInvites(i.filter((x) => !x.used_at))
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error al cargar clientes.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(reload, [reload])

  const isActive = (c: Profile) => (c.status ?? 'active') === 'active'
  const active = clients.filter(isActive)
  const inactive = clients.filter((c) => !isActive(c))
  const shown = tab === 'active' ? active : inactive

  const reactivate = async (c: Profile) => {
    await setClientStatus(c.id, 'active')
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Mis clientes</div>
          <div style={{ fontSize: 13, color: mut(0.5), marginTop: 2 }}>
            {loading ? 'Cargando…' : `${active.length} ${active.length === 1 ? 'activo' : 'activos'}${inactive.length ? ` · ${inactive.length} inactivo${inactive.length === 1 ? '' : 's'}` : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: colors.surface1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '9px 14px', width: 240 }}>
            <Search size={15} stroke={mut(0.4)} strokeWidth={2} />
            <span style={{ fontSize: 13, color: mut(0.4) }}>Buscar cliente…</span>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Añadir cliente
          </button>
        </div>
      </div>

      {err && (
        <div style={{ fontSize: 13, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 12, padding: '12px 14px' }}>
          {err}
        </div>
      )}

      {/* pestañas activos / inactivos */}
      {!loading && clients.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {([['active', `Activos (${active.length})`], ['inactive', `Inactivos (${inactive.length})`]] as ['active' | 'inactive', string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{ background: tab === k ? colors.accent : colors.surface2, color: tab === k ? '#fff' : mut(0.6), border: tab === k ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {!loading && !err && clients.length === 0 && (
        <div style={{ background: colors.surface1, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aún no tienes clientes</div>
          <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Añade tu primer cliente con «+ Añadir cliente»: se genera un enlace de invitación para que rellene su ficha.
          </div>
        </div>
      )}

      {!loading && clients.length > 0 && shown.length === 0 && (
        <div style={{ fontSize: 13, color: mut(0.4), padding: '20px 2px' }}>
          {tab === 'inactive' ? 'No tienes clientes dados de baja. Cuando des de baja a alguien, aparecerá aquí con todo su historial guardado.' : 'No hay clientes activos.'}
        </div>
      )}

      {shown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {shown.map((c) => (
            <ClientCard key={c.id} c={c} inactive={tab === 'inactive'} onClick={() => onOpen(c.id)} onReactivate={() => reactivate(c)} />
          ))}
        </div>
      )}

      {/* invitaciones pendientes */}
      {invites.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Invitaciones pendientes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.surface1, border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 12, padding: '12px 15px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.full_name || 'Sin nombre'}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>
                    {inv.email || 'Sin email'} · creada el {inv.created_at.slice(0, 10)}
                  </div>
                </div>
                <CopyBtn text={inviteLink(inv.id)} />
                {inv.email && (
                  <a href={inviteMailto(inv)} style={{ fontSize: 12, fontWeight: 600, background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 12px', color: colors.text }}>
                    ✉ Email
                  </a>
                )}
                <button
                  onClick={() => deleteInvite(inv.id).then(reload)}
                  style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onDone={() => {
            setInviteOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        })
      }}
      style={{ fontSize: 12, fontWeight: 600, background: copied ? 'rgba(74,222,128,0.14)' : colors.surface2, border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 9, padding: '8px 12px', color: copied ? colors.green : colors.text, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      {copied ? '✓ Copiado' : '⧉ Copiar enlace'}
    </button>
  )
}

// ---------- Modal: invitar cliente ----------
function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [created, setCreated] = useState<Invite | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    setBusy(true)
    setErr(null)
    try {
      const inv = await createInvite(name.trim() || null, email.trim() || null)
      setCreated(inv)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la invitación.')
    } finally {
      setBusy(false)
    }
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

  return (
    <Modal title="Añadir cliente" onClose={created ? onDone : onClose}>
      {!created ? (
        <>
          <div style={{ fontSize: 12.5, color: mut(0.5), lineHeight: 1.55, marginBottom: 14 }}>
            Se genera un enlace de invitación. Tu cliente lo abre, crea su contraseña y <b style={{ color: mut(0.8) }}>rellena él mismo su ficha completa</b> (datos, lesiones, objetivo…).
          </div>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre (opcional, se lo precargamos)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marco Ríos" style={fieldStyle} />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Email (opcional, para enviárselo)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="cliente@correo.com" style={fieldStyle} />
          </label>
          {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
          <button
            onClick={create}
            disabled={busy}
            style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Generando…' : 'Generar invitación'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.green, marginBottom: 8 }}>✓ Invitación creada</div>
          <div style={{ fontSize: 12.5, color: mut(0.55), lineHeight: 1.55, marginBottom: 14 }}>
            Envíasela a {created.full_name || 'tu cliente'} como prefieras:
          </div>
          <div style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', fontSize: 11.5, color: mut(0.7), wordBreak: 'break-all', marginBottom: 12 }}>
            {inviteLink(created.id)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <CopyBtn text={inviteLink(created.id)} />
            </div>
            {created.email && (
              <a
                href={inviteMailto(created)}
                style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 12px', color: colors.text }}
              >
                ✉ Enviar por email
              </a>
            )}
          </div>
          <button
            onClick={onDone}
            style={{ width: '100%', marginTop: 16, background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 13, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Hecho
          </button>
        </>
      )}
    </Modal>
  )
}

function ClientCard({ c, onClick, inactive, onReactivate }: { c: Profile; onClick: () => void; inactive?: boolean; onReactivate?: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#141414' : colors.surface1,
        border: `1px solid ${hover ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        padding: 18,
        cursor: 'pointer',
        opacity: inactive ? 0.72 : 1,
        transition: 'border-color .15s, background .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#2a2a2a,#161616)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
          {initials(c.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.full_name || 'Cliente'}
            {inactive && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: mut(0.6), background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '2px 7px' }}>BAJA</span>}
          </div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>
            {inactive && c.deactivated_at ? `De baja desde ${c.deactivated_at.slice(0, 10)}` : c.plan ? `Plan ${c.plan}` : 'Sin plan asignado'}
          </div>
        </div>
        <Chevron />
      </div>

      {inactive && onReactivate && (
        <button
          onClick={(e) => { e.stopPropagation(); onReactivate() }}
          style={{ width: '100%', marginTop: 14, background: 'rgba(74,222,128,0.12)', color: colors.green, border: '1px solid rgba(74,222,128,0.35)', borderRadius: 10, padding: '9px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          ↩ Reactivar cliente
        </button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: mut(0.5) }}>Cumplimiento</span>
        <span style={{ fontWeight: 700, color: adhColor(c.adherence ?? 0) }}>{c.adherence ?? 0}%</span>
      </div>
      <div style={{ height: 7, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${c.adherence ?? 0}%`, height: '100%', background: adhColor(c.adherence ?? 0), borderRadius: 999 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: mut(0.5), borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 14 }}>
        <span>{c.email || 'Sin email'}</span>
        <span style={{ color: colors.accent, fontWeight: 600 }}>Ver evolución</span>
      </div>
    </div>
  )
}
