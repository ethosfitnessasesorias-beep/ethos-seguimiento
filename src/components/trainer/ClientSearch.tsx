import { useEffect, useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import { listClients, type Profile } from '../../lib/db'
import type { TrainerTab } from './TrainerApp'

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

/** Buscador global: encuentra cualquier cliente por nombre, email o teléfono. */
export default function ClientSearch({ onOpenClient }: { onOpenClient: (id: string, tab: TrainerTab) => void }) {
  const [q, setQ] = useState('')
  const [all, setAll] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  // Incluye a los inactivos: buscar a un cliente antiguo también es útil.
  useEffect(() => {
    listClients('all').then(setAll).catch(() => setAll([]))
  }, [])

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [])

  const term = q.trim().toLowerCase()
  const results = term
    ? all
        .filter((c) =>
          [c.full_name, c.email, c.phone, c.plan].some((v) => (v ?? '').toLowerCase().includes(term)),
        )
        .slice(0, 8)
    : []

  const pick = (c: Profile) => {
    onOpenClient(c.id, 'evolucion')
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setHi(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!results.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHi((h) => Math.min(h + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHi((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(results[hi])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder="🔍 Buscar cliente…"
        style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
      />

      {open && term.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: colors.surface1, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.55)', zIndex: 50, overflow: 'hidden' }}>
          {results.length === 0 ? (
            <div style={{ fontSize: 12.5, color: mut(0.4), padding: '12px 14px' }}>Ningún cliente con «{q.trim()}»</div>
          ) : (
            results.map((c, i) => {
              const inactive = (c.status ?? 'active') !== 'active'
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(c)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: i === hi ? colors.surface2 : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <span style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', opacity: inactive ? 0.5 : 1 }}>
                    {initials(c.full_name)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: inactive ? mut(0.55) : colors.text }}>
                      {c.full_name || 'Cliente'}
                      {inactive && <span style={{ fontSize: 10, color: colors.amber, marginLeft: 7, fontWeight: 600 }}>BAJA</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: 10.5, color: mut(0.45), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[c.plan, c.email, c.phone].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
