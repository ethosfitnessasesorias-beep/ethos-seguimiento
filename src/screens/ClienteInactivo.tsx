import { colors, mut } from '../theme'

// Pantalla que ven los clientes dados de baja: acceso bloqueado + contacto.
const WHATSAPP_URL =
  'https://wa.me/34646651118?text=' + encodeURIComponent('Hola, me gustaría información sobre ETHOS Fitness.')

export default function ClienteInactivo({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(900px 500px at 50% -10%, #161616 0%, #080808 55%)' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 56, marginBottom: 18 }} />

        <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '30px 24px' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: '50%', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            🔒
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>
            Esta app es exclusiva para clientes de ETHOS Fitness
          </div>
          <div style={{ fontSize: 13.5, color: mut(0.6), lineHeight: 1.6, marginBottom: 22 }}>
            Tu cuenta no está activa ahora mismo. Si quieres retomar tu seguimiento, ponte en contacto con nosotros y te reactivamos enseguida.
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#25D366', color: '#04310f', textDecoration: 'none', borderRadius: 13, padding: '14px 18px', fontFamily: 'inherit', fontSize: 15, fontWeight: 800 }}
          >
            <span style={{ fontSize: 18 }}>💬</span> Contactar por WhatsApp
          </a>
          <div style={{ fontSize: 12, color: mut(0.45), marginTop: 12 }}>o llámanos al <b style={{ color: mut(0.7) }}>646 65 11 18</b></div>
        </div>

        <button
          onClick={onSignOut}
          style={{ marginTop: 18, background: 'none', border: 'none', color: mut(0.4), fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
