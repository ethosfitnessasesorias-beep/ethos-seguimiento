import { useState } from 'react'
import { colors, mut } from '../theme'
import { useAuth } from '../lib/auth'

const LAST_EMAIL_KEY = 'ethos_last_email'

export default function Login() {
  const { signIn, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  const sendReset = async () => {
    if (!email.trim() || !email.includes('@')) {
      setResetMsg('Escribe tu correo arriba y vuelve a pulsar.')
      return
    }
    setResetBusy(true)
    setResetMsg(null)
    try {
      await requestPasswordReset(email)
      setResetMsg('Te hemos enviado un correo con el enlace para cambiar la contraseña. Revisa también el spam.')
    } catch (err) {
      setResetMsg(traducirError(err))
    } finally {
      setResetBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const clean = email.trim().toLowerCase()
      await signIn(clean, password)
      // Recuerda el correo en este dispositivo para la próxima vez.
      localStorage.setItem(LAST_EMAIL_KEY, clean)
    } catch (err) {
      setError(traducirError(err))
    } finally {
      setBusy(false)
    }
  }

  const input: React.CSSProperties = {
    width: '100%',
    background: colors.surface2,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '13px 14px',
    color: colors.text,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  }
  const label: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: 0.5,
    color: mut(0.5),
    fontWeight: 600,
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 52, width: 'auto' }} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: mut(0.45), fontWeight: 600, marginTop: 10 }}>
            ETHOS GYM · SEGUIMIENTO
          </div>
        </div>

        <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 22 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="login-email" style={label}>EMAIL</label>
              <input
                id="login-email"
                name="username"
                style={input}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@correo.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" style={label}>CONTRASEÑA</label>
              <input
                id="login-password"
                name="password"
                style={input}
                type="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{ fontSize: 12.5, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{ width: '100%', marginTop: 4, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Un momento…' : 'Entrar'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: mut(0.4), marginTop: 2 }}>
              🔒 Tu sesión queda guardada en este dispositivo.
            </div>
          </form>

          {/* ¿Olvidaste tu contraseña? */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!forgot ? (
              <button
                onClick={() => { setForgot(true); setResetMsg(null) }}
                style={{ width: '100%', background: 'none', border: 'none', color: mut(0.55), fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, color: mut(0.6), lineHeight: 1.5, marginBottom: 10 }}>
                  Te enviaremos un enlace a <b style={{ color: colors.text }}>{email || 'tu correo'}</b> para crear una nueva.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={sendReset}
                    disabled={resetBusy}
                    style={{ flex: 1, background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 11, padding: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: resetBusy ? 0.6 : 1 }}
                  >
                    {resetBusy ? 'Enviando…' : 'Enviar enlace'}
                  </button>
                  <button
                    onClick={() => { setForgot(false); setResetMsg(null) }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '12px 14px', color: mut(0.5), fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
                {resetMsg && <div style={{ fontSize: 12, color: resetMsg.startsWith('Te hemos') ? colors.green : '#f5a99f', marginTop: 10, lineHeight: 1.5 }}>{resetMsg}</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: mut(0.35), marginTop: 16, lineHeight: 1.6 }}>
          ¿No tienes cuenta? El acceso se crea por invitación:
          <br />
          pídele el enlace a tu entrenador.
        </div>
      </div>
    </div>
  )
}

function traducirError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/Email not confirmed/i.test(msg)) return 'Tu email aún no está confirmado. Revisa tu correo.'
  return msg
}
