import { useState } from 'react'
import { colors, mut } from '../../theme'
import { clients } from '../../data'
import { Search, Chevron } from '../icons'

interface Props {
  onOpen: (idx: number) => void
}

export default function Clientes({ onOpen }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Mis clientes</div>
          <div style={{ fontSize: 13, color: mut(0.5), marginTop: 2 }}>6 clientes activos</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: colors.surface1,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 11,
              padding: '9px 14px',
              width: 240,
            }}
          >
            <Search size={15} stroke={mut(0.4)} strokeWidth={2} />
            <span style={{ fontSize: 13, color: mut(0.4) }}>Buscar cliente…</span>
          </div>
          <button
            style={{
              background: colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 11,
              padding: '10px 16px',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Añadir cliente
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {clients.map((c, idx) => (
          <ClientCard key={c.name} c={c} onClick={() => onOpen(idx)} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({
  c,
  onClick,
}: {
  c: (typeof clients)[number]
  onClick: () => void
}) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 }}>
        <div
          style={{
            width: 46,
            height: 46,
            flex: 'none',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#2a2a2a,#161616)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {c.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>Plan {c.plan}</div>
        </div>
        <Chevron />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: mut(0.5) }}>Adherencia</span>
        <span style={{ fontWeight: 700, color: c.color }}>{c.adherence}%</span>
      </div>
      <div style={{ height: 7, background: colors.surface2, borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: c.adhW, height: '100%', background: c.color, borderRadius: 999 }} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: mut(0.5),
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 11,
        }}
      >
        <span>{c.last}</span>
        <span style={{ color: mut(0.7), fontWeight: 500 }}>{c.next}</span>
      </div>
    </div>
  )
}
