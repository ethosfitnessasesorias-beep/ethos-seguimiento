import { useState } from 'react'
import { colors, mut } from '../theme'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
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
              <span style={label}>EMAIL</span>
              <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@correo.com" autoComplete="email" />
            </div>
            <div>
              <span style={label}>CONTRASEÑA</span>
              <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
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
          </form>
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
