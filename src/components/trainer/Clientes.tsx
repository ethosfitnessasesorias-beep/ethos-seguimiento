import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, type Profile } from '../../lib/db'
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
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error al cargar clientes.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Mis clientes</div>
          <div style={{ fontSize: 13, color: mut(0.5), marginTop: 2 }}>
            {loading ? 'Cargando…' : `${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: colors.surface1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '9px 14px', width: 240 }}>
            <Search size={15} stroke={mut(0.4)} strokeWidth={2} />
            <span style={{ fontSize: 13, color: mut(0.4) }}>Buscar cliente…</span>
          </div>
          <button
            title="Disponible en la próxima fase"
            style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: 0.5 }}
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

      {!loading && !err && clients.length === 0 && (
        <div style={{ background: colors.surface1, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aún no tienes clientes</div>
          <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Cuando un cliente cree su cuenta desde la app, aparecerá aquí y podrás ver su evolución. En la próxima fase podrás darlos de alta tú mismo e invitarlos.
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {clients.map((c) => (
            <ClientCard key={c.id} c={c} onClick={() => onOpen(c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientCard({ c, onClick }: { c: Profile; onClick: () => void }) {
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
        transition: 'border-color .15s, background .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#2a2a2a,#161616)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
          {initials(c.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.full_name || 'Cliente'}</div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>{c.plan ? `Plan ${c.plan}` : 'Sin plan asignado'}</div>
        </div>
        <Chevron />
      </div>
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
