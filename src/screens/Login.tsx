import { useState } from 'react'
import { colors, mut } from '../theme'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/db'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<Role>('client')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        if (!fullName.trim()) throw new Error('Escribe tu nombre.')
        await signUp({ email: email.trim(), password, fullName: fullName.trim(), role })
      }
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
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 52, width: 'auto' }} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: mut(0.45), fontWeight: 600, marginTop: 10 }}>
            ETHOS GYM · SEGUIMIENTO
          </div>
        </div>

        <div
          style={{
            background: colors.surface1,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: 22,
          }}
        >
          {/* tabs login / signup */}
          <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 999, padding: 4, marginBottom: 20 }}>
            <TabBtn active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </TabBtn>
            <TabBtn active={mode === 'signup'} onClick={() => setMode('signup')}>
              Crear cuenta
            </TabBtn>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <span style={label}>NOMBRE Y APELLIDOS</span>
                <input style={input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Marco Ríos" />
              </div>
            )}
            <div>
              <span style={label}>EMAIL</span>
              <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@correo.com" autoComplete="email" />
            </div>
            <div>
              <span style={label}>CONTRASEÑA</span>
              <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {mode === 'signup' && (
              <div>
                <span style={label}>¿QUIÉN ERES?</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <RoleBtn active={role === 'client'} onClick={() => setRole('client')}>
                    Cliente
                  </RoleBtn>
                  <RoleBtn active={role === 'trainer'} onClick={() => setRole('trainer')}>
                    Entrenador
                  </RoleBtn>
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12.5, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                marginTop: 4,
                background: colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: 14,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: mut(0.35), marginTop: 16, lineHeight: 1.5 }}>
          {mode === 'login' ? '¿Aún no tienes cuenta? Pulsa «Crear cuenta».' : 'Podrás instalar la app en tu móvil tras entrar.'}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? colors.accent : 'transparent',
        color: active ? '#fff' : mut(0.55),
        border: 'none',
        borderRadius: 999,
        padding: '9px 0',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function RoleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'rgba(219,24,9,0.14)' : colors.surface2,
        color: active ? colors.text : mut(0.6),
        border: `1px solid ${active ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12,
        padding: '12px 0',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function traducirError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/already registered/i.test(msg)) return 'Ese email ya tiene una cuenta. Pulsa «Entrar».'
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/Email not confirmed/i.test(msg)) return 'Tu email aún no está confirmado. Revisa tu correo o desactiva la confirmación en Supabase.'
  if (/Unable to validate email address/i.test(msg)) return 'El email no parece válido.'
  return msg
}
