import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'

// Evento no tipado en TS estándar.
interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const KEY = 'ethos_install_dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [show, setShow] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(KEY) === '1') return
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    // iOS no dispara el evento: mostramos ayuda manual.
    if (isIOS()) setShow(true)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem(KEY, '1')
    setShow(false)
  }

  const install = async () => {
    if (deferred) {
      await deferred.prompt()
      dismiss()
    } else if (isIOS()) {
      setIosHelp(true)
    }
  }

  return (
    <div style={{ margin: '0 0 14px', background: 'linear-gradient(135deg,rgba(219,24,9,0.18),rgba(219,24,9,0.06))', border: '1px solid rgba(219,24,9,0.35)', borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/assets/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Instala ETHOS en tu móvil</div>
          <div style={{ fontSize: 11.5, color: mut(0.6), marginTop: 2 }}>Ábrela como una app, a pantalla completa.</div>
        </div>
        <button onClick={install} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
          Instalar
        </button>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
      </div>
      {iosHelp && (
        <div style={{ fontSize: 11.5, color: mut(0.7), marginTop: 10, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
          En iPhone: pulsa el botón <b>Compartir</b> (el cuadrado con la flecha ↑) y luego <b>«Añadir a pantalla de inicio»</b>.
        </div>
      )}
    </div>
  )
}
