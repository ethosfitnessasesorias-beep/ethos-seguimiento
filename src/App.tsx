import { useState } from 'react'
import { colors, mut } from './theme'
import { useAuth } from './lib/auth'
import { upsertProfile } from './lib/db'
import Login from './screens/Login'
import Invitacion from './screens/Invitacion'
import ClientApp from './components/client/ClientApp'
import TrainerApp from './components/trainer/TrainerApp'

function readInviteToken(): string | null {
  const t = new URLSearchParams(window.location.search).get('invite')
  return t && /^[0-9a-f-]{36}$/i.test(t) ? t : null
}

function clearInviteParam() {
  window.history.replaceState({}, '', window.location.pathname)
}

export default function App() {
  const { loading, session, profile, refreshProfile, signOut } = useAuth()
  const [inviteToken, setInviteToken] = useState<string | null>(readInviteToken)

  if (loading) return <Splash />

  // Registro por invitación (enlace ?invite=…)
  if (!session && inviteToken) {
    return (
      <Invitacion
        token={inviteToken}
        onDone={() => {
          clearInviteParam()
          setInviteToken(null)
        }}
      />
    )
  }

  if (!session) return <Login />
  // Sesión iniciada pero sin ficha: si venía con invitación, completarla ahí.
  if (!profile && inviteToken) {
    return (
      <Invitacion
        token={inviteToken}
        onDone={() => {
          clearInviteParam()
          setInviteToken(null)
        }}
      />
    )
  }
  if (!profile) return <ProfileSetup userId={session.user.id} email={session.user.email ?? null} onDone={refreshProfile} />

  return profile.role === 'trainer' ? (
    <TrainerApp profile={profile} onSignOut={signOut} />
  ) : (
    <ClientApp profile={profile} onSignOut={signOut} />
  )
}

function Splash() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 46, opacity: 0.9 }} />
      <div style={{ fontSize: 12, color: mut(0.4), letterSpacing: 2 }}>Cargando…</div>
    </div>
  )
}

// Pantalla de rescate: hay cuenta pero falta la ficha (siempre como cliente).
function ProfileSetup({ userId, email, onDone }: { userId: string; email: string | null; onDone: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const { signOut } = useAuth()

  const save = async () => {
    setBusy(true)
    try {
      await upsertProfile({ id: userId, role: 'client', full_name: name.trim() || null, email })
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ width: '100%', maxWidth: 360, background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Completa tu perfil</div>
        <div style={{ fontSize: 13, color: mut(0.5), marginBottom: 18 }}>Solo una vez, para dejar tu cuenta lista.</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre y apellidos"
          style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 14px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none', marginBottom: 16 }}
        />
        <button
          onClick={save}
          disabled={busy}
          style={{ width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Guardando…' : 'Guardar y entrar'}
        </button>
        <button
          onClick={signOut}
          style={{ width: '100%', marginTop: 10, background: 'none', color: mut(0.45), border: 'none', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
