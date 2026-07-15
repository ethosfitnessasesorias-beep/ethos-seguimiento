import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getProfile, upsertProfile, type Profile, type Role } from './db'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  recovery: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (args: { email: string; password: string; fullName: string; role: Role }) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  clearRecovery: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  const loadProfile = async (userId: string) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      if (s) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async ({
    email,
    password,
    fullName,
    role,
  }: {
    email: string
    password: string
    fullName: string
    role: Role
  }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const user = data.user
    if (user) {
      // Crea la ficha de perfil enlazada a la cuenta recién creada.
      await upsertProfile({ id: user.id, role, full_name: fullName, email })
      if (data.session) await loadProfile(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRecovery(false)
  }

  // Envía el correo con el enlace para restablecer la contraseña.
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  // Guarda la nueva contraseña (durante el flujo de recuperación).
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const clearRecovery = () => setRecovery(false)

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, recovery, refreshProfile, signIn, signUp, signOut, requestPasswordReset, updatePassword, clearRecovery }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
