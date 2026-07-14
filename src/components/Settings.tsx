import { useState } from 'react'
import { colors, mut } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { updateProfile, type Profile } from '../lib/db'
import { disablePush, enablePush, notificationPermission } from '../lib/push'

const APP_VERSION = '1.0'

interface Props {
  profile: Profile
  onClose: () => void
  onSignOut: () => void
}

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function Settings({ profile, onClose, onSignOut }: Props) {
  const { refreshProfile } = useAuth()
  const isClient = profile.role === 'client'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: colors.bg, display: 'flex', justifyContent: 'center', overflowY: 'auto' }} className="om-scroll">
      <div style={{ width: '100%', maxWidth: 460, padding: '0 18px 40px', minHeight: '100dvh' }}>
        {/* header */}
        <div style={{ position: 'sticky', top: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 14px', zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Ajustes</div>
          <button onClick={onClose} style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, width: 34, height: 34, color: mut(0.7), cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* identidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 2px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 700 }}>
            {initials(profile.full_name)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{profile.full_name || 'Sin nombre'}</div>
            <div style={{ fontSize: 12.5, color: mut(0.5), marginTop: 2 }}>{isClient ? 'Cliente' : 'Entrenador'} · {profile.email}</div>
          </div>
        </div>

        <AccountSection profile={profile} onSaved={refreshProfile} />
        {isClient && <MyDataSection profile={profile} onSaved={refreshProfile} />}
        {isClient && <NotificationsSection clientId={profile.id} />}
        <PasswordSection />

        {/* cerrar sesión */}
        <Section title="SESIÓN">
          <button onClick={onSignOut} style={{ width: '100%', background: 'rgba(219,24,9,0.12)', color: colors.accent, border: '1px solid rgba(219,24,9,0.35)', borderRadius: 12, padding: 13, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </Section>

        <div style={{ textAlign: 'center', fontSize: 11, color: mut(0.3), marginTop: 26, lineHeight: 1.7 }}>
          <img src="/assets/ethos-logo.png" alt="" style={{ height: 26, opacity: 0.5 }} />
          <div style={{ marginTop: 6 }}>ETHOS GYM · Seguimiento</div>
          <div>Versión {APP_VERSION}</div>
        </div>
      </div>
    </div>
  )
}

// ---------- Secciones ----------
function AccountSection({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(profile.full_name ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await updateProfile(profile.id, { full_name: name.trim() || null })
      await onSaved()
      setMsg('Guardado ✓')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="CUENTA">
      <Field label="Nombre y apellidos" value={name} onChange={setName} />
      <Field label="Email" value={profile.email ?? ''} onChange={() => {}} disabled />
      <SaveButton onClick={save} busy={busy} msg={msg} />
    </Section>
  )
}

function MyDataSection({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await updateProfile(profile.id, { phone: phone.trim() || null, city: city.trim() || null })
      await onSaved()
      setMsg('Guardado ✓')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="MIS DATOS DE CONTACTO">
      <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+34 600 12 34 56" />
      <Field label="Ciudad" value={city} onChange={setCity} placeholder="Valencia" />
      <SaveButton onClick={save} busy={busy} msg={msg} />
    </Section>
  )
}

function NotificationsSection({ clientId }: { clientId: string }) {
  const [perm, setPerm] = useState(notificationPermission())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const activate = async () => {
    setBusy(true)
    setMsg(null)
    const r = await enablePush(clientId)
    setBusy(false)
    setPerm(notificationPermission())
    if (r === 'ok') setMsg('Notificaciones activadas ✓')
    else if (r === 'denied') setMsg('Bloqueadas. Actívalas en los ajustes del navegador (candado 🔒).')
    else if (r === 'unsupported') setMsg('Tu navegador no admite notificaciones.')
    else setMsg('No se pudo activar.')
  }

  const deactivate = async () => {
    setBusy(true)
    await disablePush()
    setBusy(false)
    setMsg('Notificaciones desactivadas en este dispositivo.')
  }

  const on = perm === 'granted'
  return (
    <Section title="NOTIFICACIONES">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 15px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Avisos y mensajes</div>
          <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>
            {perm === 'unsupported' ? 'No disponible en este navegador' : on ? 'Activadas en este dispositivo' : 'Desactivadas'}
          </div>
        </div>
        {perm !== 'unsupported' &&
          (on ? (
            <button onClick={deactivate} disabled={busy} style={pillBtn(false)}>Desactivar</button>
          ) : (
            <button onClick={activate} disabled={busy} style={pillBtn(true)}>Activar</button>
          ))}
      </div>
      {msg && <div style={{ fontSize: 11.5, color: mut(0.6), marginTop: 8 }}>{msg}</div>}
    </Section>
  )
}

function PasswordSection() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const save = async () => {
    if (pw.length < 6) return setMsg('Mínimo 6 caracteres.')
    if (pw !== pw2) return setMsg('Las contraseñas no coinciden.')
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setMsg(error.message)
    else {
      setMsg('Contraseña actualizada ✓')
      setPw('')
      setPw2('')
    }
  }

  return (
    <Section title="SEGURIDAD">
      <Field label="Nueva contraseña" value={pw} onChange={setPw} type="password" placeholder="••••••••" />
      <Field label="Repite la contraseña" value={pw2} onChange={setPw2} type="password" placeholder="••••••••" />
      <SaveButton onClick={save} busy={busy} msg={msg} label="Cambiar contraseña" />
    </Section>
  )
}

// ---------- UI helpers ----------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: mut(0.4), fontWeight: 700, margin: '0 2px 10px' }}>{title}</div>
      {children}
    </div>
  )
}

const inputStyle = (disabled?: boolean): React.CSSProperties => ({
  width: '100%',
  background: disabled ? '#0c0c0c' : colors.surface2,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '12px 13px',
  color: disabled ? mut(0.45) : colors.text,
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
})

function Field({ label, value, onChange, type = 'text', placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} disabled={disabled} style={inputStyle(disabled)} />
    </label>
  )
}

function SaveButton({ onClick, busy, msg, label = 'Guardar' }: { onClick: () => void; busy: boolean; msg: string | null; label?: string }) {
  const good = msg?.includes('✓')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
      <button onClick={onClick} disabled={busy} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '11px 20px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? '…' : label}
      </button>
      {msg && <span style={{ fontSize: 12, color: good ? colors.green : '#f5a99f' }}>{msg}</span>}
    </div>
  )
}

function pillBtn(primary: boolean): React.CSSProperties {
  return {
    background: primary ? colors.accent : colors.surface2,
    color: primary ? '#fff' : mut(0.7),
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: '9px 16px',
    fontFamily: 'inherit',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
