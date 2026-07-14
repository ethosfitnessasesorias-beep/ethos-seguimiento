import { useState } from 'react'
import { colors, mut } from '../../theme'
import { enablePush, notificationPermission } from '../../lib/push'

const KEY = 'ethos_notif_dismissed'

export default function NotifPrompt({ clientId }: { clientId: string }) {
  const initial = notificationPermission()
  const [hidden, setHidden] = useState(
    initial === 'granted' || initial === 'unsupported' || localStorage.getItem(KEY) === '1',
  )
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (hidden) return null

  const activate = async () => {
    setBusy(true)
    setMsg(null)
    const r = await enablePush(clientId)
    setBusy(false)
    if (r === 'ok') {
      setMsg('¡Notificaciones activadas! 🔔')
      setTimeout(() => setHidden(true), 1400)
    } else if (r === 'denied') {
      setMsg('Las bloqueaste. Puedes activarlas desde los ajustes del navegador.')
    } else if (r === 'unsupported') {
      setHidden(true)
    } else {
      setMsg('No se pudo activar. Inténtalo de nuevo más tarde.')
    }
  }

  const dismiss = () => {
    localStorage.setItem(KEY, '1')
    setHidden(true)
  }

  return (
    <div style={{ margin: '0 0 14px', background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', background: colors.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Activa las notificaciones</div>
          <div style={{ fontSize: 11.5, color: mut(0.6), marginTop: 2 }}>Recibe los recordatorios y mensajes de tu entrenador.</div>
        </div>
        <button onClick={activate} disabled={busy} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : 'Activar'}
        </button>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
      </div>
      {msg && <div style={{ fontSize: 11.5, color: mut(0.7), marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 9 }}>{msg}</div>}
    </div>
  )
}
