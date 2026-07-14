import { useEffect, useState } from 'react'
import { colors, mut } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { getInvite, redeemInvite, type InvitePublic } from '../lib/invites'

interface Props {
  token: string
  onDone: () => void
}

export default function Invitacion({ token, onDone }: Props) {
  const { refreshProfile } = useAuth()
  const [invite, setInvite] = useState<InvitePublic | null | 'loading'>('loading')

  // formulario
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<string | null>(null)
  const [height, setHeight] = useState('')
  const [injuries, setInjuries] = useState('')
  const [pathologies, setPathologies] = useState('')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getInvite(token)
      .then((inv) => {
        setInvite(inv)
        if (inv) {
          if (inv.full_name) setFullName(inv.full_name)
          if (inv.email) setEmail(inv.email)
        }
      })
      .catch(() => setInvite(null))
  }, [token])

  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return s.trim() === '' || !isFinite(n) ? null : n
  }
  const txt = (s: string) => (s.trim() === '' ? null : s.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!fullName.trim()) return setErr('Escribe tu nombre y apellidos.')
    if (!email.trim()) return setErr('Escribe tu email.')
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.')
    if (!sex) return setErr('Indica tu sexo (se usa para calcular tu composición corporal).')
    setBusy(true)
    try {
      const { error: suErr } = await supabase.auth.signUp({ email: email.trim(), password })
      if (suErr) {
        if (/already registered/i.test(suErr.message)) throw new Error('Ese email ya tiene una cuenta. Entra con tu contraseña.')
        throw suErr
      }
      await redeemInvite(token, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: txt(phone),
        city: txt(city),
        age: num(age) != null ? Math.round(num(age)!) : null,
        sex,
        height_cm: num(height),
        injuries: txt(injuries),
        pathologies: txt(pathologies),
        main_goal: txt(goal),
      })
      await refreshProfile()
      onDone()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'No se pudo completar el registro.')
      setBusy(false)
    }
  }

  if (invite === 'loading') {
    return <Center><div style={{ fontSize: 13, color: mut(0.4) }}>Comprobando invitación…</div></Center>
  }

  if (!invite || invite.used) {
    return (
      <Center>
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 46, opacity: 0.9 }} />
          <div style={{ fontSize: 17, fontWeight: 700, margin: '18px 0 8px' }}>
            {invite?.used ? 'Esta invitación ya se ha usado' : 'Invitación no válida'}
          </div>
          <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6 }}>
            Pide a tu entrenador que te genere una nueva invitación, o si ya tienes cuenta,{' '}
            <a href="/" style={{ fontWeight: 600 }}>entra desde aquí</a>.
          </div>
        </div>
      </Center>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', padding: '28px 18px 40px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 46 }} />
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 12 }}>¡Bienvenido/a a ETHOS GYM!</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginTop: 5, lineHeight: 1.5 }}>
            Crea tu acceso y rellena tu ficha. Solo te llevará 2 minutos.
          </div>
        </div>

        <form onSubmit={submit} style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20 }}>
          <Section>TU CUENTA</Section>
          <Field label="Nombre y apellidos *" value={fullName} onChange={setFullName} placeholder="Marco Ríos" />
          <Field label="Email *" value={email} onChange={setEmail} type="email" placeholder="tucorreo@correo.com" />
          <Field label="Contraseña * (mín. 6 caracteres)" value={password} onChange={setPassword} type="password" placeholder="••••••••" />

          <Section top={18}>TUS DATOS</Section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Edad" value={age} onChange={setAge} inputMode="numeric" placeholder="34" compact />
            <Field label="Altura (cm)" value={height} onChange={setHeight} inputMode="decimal" placeholder="178" compact />
            <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+34 600 12 34 56" compact />
            <Field label="Ciudad" value={city} onChange={setCity} placeholder="Valencia" compact />
          </div>
          <div style={{ margin: '12px 0' }}>
            <span style={labelStyle}>Sexo * (para calcular tu composición corporal)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ k: 'male', l: 'Hombre' }, { k: 'female', l: 'Mujer' }].map((o) => (
                <button
                  type="button"
                  key={o.k}
                  onClick={() => setSex(o.k)}
                  style={{ flex: 1, background: sex === o.k ? 'rgba(219,24,9,0.14)' : colors.surface2, color: sex === o.k ? colors.text : mut(0.6), border: `1px solid ${sex === o.k ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '11px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <Section top={18}>TU SALUD Y OBJETIVO</Section>
          <Area label="Lesiones (si tienes)" value={injuries} onChange={setInjuries} placeholder="Ej: molestia en hombro derecho al hacer press…" />
          <Area label="Patologías y alergias" value={pathologies} onChange={setPathologies} placeholder="Ej: intolerancia a la lactosa…" />
          <Area label="Tu objetivo principal" value={goal} onChange={setGoal} placeholder="Ej: perder grasa manteniendo músculo de cara al verano" />

          {err && (
            <div style={{ fontSize: 12.5, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginTop: 12, lineHeight: 1.4 }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Creando tu cuenta…' : 'Crear mi cuenta y empezar'}
          </button>
          <div style={{ fontSize: 10.5, color: mut(0.35), marginTop: 10, textAlign: 'center' }}>
            Los campos con * son obligatorios. El resto puedes completarlo después.
          </div>
        </form>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      {children}
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: colors.surface2,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '12px 13px',
  color: colors.text,
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
}

function Section({ children, top = 0 }: { children: React.ReactNode; top?: number }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: mut(0.4), fontWeight: 700, margin: `${top}px 0 10px` }}>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, inputMode, compact }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; inputMode?: 'numeric' | 'decimal'; compact?: boolean }) {
  return (
    <label style={{ display: 'block', marginBottom: compact ? 0 : 12 }}>
      <span style={labelStyle}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} inputMode={inputMode} style={inputStyle} />
    </label>
  )
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
    </label>
  )
}
