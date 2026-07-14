import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { claimGift, giftTimeline, listClaims, nextGift, type GiftClaim, type GiftStep, type Milestone } from '../../lib/gifts'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

export default function RegalosFidelidad({ clientId, startISO }: { clientId: string; startISO: string }) {
  const [claims, setClaims] = useState<GiftClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Milestone | null>(null)

  const load = useCallback(async () => {
    try {
      setClaims(await listClaims(clientId))
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [clientId])
  useEffect(() => {
    load()
  }, [load])

  if (loading) return null

  const steps = giftTimeline(startISO, claims)
  const next = nextGift(steps)

  const claim = async (m: Milestone) => {
    setBusy(m)
    try {
      await claimGift(clientId, m)
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ ...card, padding: '16px 16px 14px', marginTop: 16, background: 'linear-gradient(160deg,rgba(219,24,9,0.10),rgba(17,17,17,1) 55%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>🎁</span>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Regalos de fidelidad</div>
      </div>
      <div style={{ fontSize: 12, color: mut(0.55), marginBottom: 14 }}>
        {next
          ? next.status === 'available'
            ? '¡Tienes un regalo disponible para reclamar!'
            : `Faltan ${next.daysRemaining} días para tu ${next.label.toLowerCase()}.`
          : '¡Has desbloqueado todos tus regalos! 🎉'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s) => (
          <GiftRow key={s.key} step={s} busy={busy === s.key} onClaim={() => claim(s.key)} />
        ))}
      </div>
    </div>
  )
}

function GiftRow({ step, busy, onClaim }: { step: GiftStep; busy: boolean; onClaim: () => void }) {
  const dotColor =
    step.status === 'delivered' ? colors.green : step.status === 'claimed' ? colors.amber : step.status === 'available' ? colors.accent : 'rgba(255,255,255,0.2)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: dotColor, flex: 'none', boxShadow: step.status === 'available' ? `0 0 0 4px rgba(219,24,9,0.18)` : 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: step.status === 'locked' ? mut(0.55) : colors.text }}>{step.label}</div>
        <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 1 }}>
          {step.status === 'locked' && `Disponible en ${step.daysRemaining} días`}
          {step.status === 'available' && '¡Disponible ahora!'}
          {step.status === 'claimed' && 'Reclamado · tu entrenador te lo entregará'}
          {step.status === 'delivered' && 'Entregado ✓'}
        </div>
      </div>
      {step.status === 'available' && (
        <button
          onClick={onClaim}
          disabled={busy}
          style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? '…' : 'Reclamar'}
        </button>
      )}
      {step.status === 'claimed' && <span style={{ fontSize: 11, fontWeight: 600, color: colors.amber }}>Pendiente</span>}
      {step.status === 'delivered' && <span style={{ fontSize: 11, fontWeight: 600, color: colors.green }}>✓</span>}
    </div>
  )
}
