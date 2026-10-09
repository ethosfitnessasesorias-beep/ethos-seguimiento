import { useState } from 'react'
import { colors, mut } from '../../theme'
import { resetAccess, tempPassword } from '../../lib/invites'
import { whatsappLink } from '../../lib/db'
import Modal from '../Modal'

interface Props {
  userId: string
  name: string | null
  email: string | null
  phone?: string | null
  onClose: () => void
}

/**
 * Devuelve el acceso a alguien que no puede entrar (móvil perdido, contraseña
 * olvidada…). Dos caminos: un enlace de un solo uso, o una contraseña temporal.
 */
export default function AccessRecovery({ userId, name, email, phone, onClose }: Props) {
  const [busy, setBusy] = useState<null | 'link' | 'password'>(null)
  const [link, setLink] = useState<string | null>(null)
  const [pwd, setPwd] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const first = name?.split(' ')[0] || ''

  const genLink = async () => {
    setBusy('link')
    setErr(null)
    setPwd(null)
    try {
      const r = await resetAccess(userId, 'link')
      setLink(r.link ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo generar el enlace.')
    } finally {
      setBusy(null)
    }
  }

  const genPassword = async () => {
    const p = tempPassword()
    setBusy('password')
    setErr(null)
    setLink(null)
    try {
      await resetAccess(userId, 'password', p)
      setPwd(p)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(null)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* si falla, el texto ya está visible para copiarlo a mano */
    }
  }

  const waText = link
    ? `Hola${first ? ' ' + first : ''}, aquí tienes tu acceso a la app de ETHOS. Entra en este enlace y crea una contraseña nueva:\n\n${link}\n\n(El enlace solo sirve una vez.)`
    : pwd
      ? `Hola${first ? ' ' + first : ''}, ya puedes entrar en la app de ETHOS con:\n\nEmail: ${email ?? ''}\nContraseña temporal: ${pwd}\n\nCámbiala al entrar desde Ajustes → Contraseña.`
      : ''
  const wa = waText ? whatsappLink(phone ?? null, waText) : null

  const btn = (active: boolean): React.CSSProperties => ({
    width: '100%',
    background: active ? colors.accent : colors.surface2,
    color: active ? '#fff' : colors.text,
    border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 11,
    padding: '12px 14px',
    fontFamily: 'inherit',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
  })

  return (
    <Modal title={`Recuperar acceso · ${name || 'cuenta'}`} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: mut(0.6), lineHeight: 1.55, marginBottom: 14 }}>
        Para cuando ha perdido el móvil, no recuerda la contraseña o no puede entrar.
        {email && <> Su email de acceso es <b style={{ color: colors.text }}>{email}</b>.</>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={genLink} disabled={busy !== null} style={btn(false)}>
          {busy === 'link' ? 'Generando…' : '🔗 Generar enlace de acceso'}
          <div style={{ fontSize: 11, fontWeight: 500, color: mut(0.5), marginTop: 3 }}>
            Entra con un clic y crea su contraseña. Sirve una sola vez.
          </div>
        </button>
        <button onClick={genPassword} disabled={busy !== null} style={btn(false)}>
          {busy === 'password' ? 'Cambiando…' : '🔑 Poner una contraseña temporal'}
          <div style={{ fontSize: 11, fontWeight: 500, color: mut(0.5), marginTop: 3 }}>
            Se la dictas y la cambia al entrar. Útil si tampoco tiene su email a mano.
          </div>
        </button>
      </div>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}

      {(link || pwd) && (
        <div style={{ marginTop: 16, background: colors.surface2, borderRadius: 12, padding: '12px 13px' }}>
          {pwd && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 4 }}>CONTRASEÑA TEMPORAL</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, color: colors.green }}>{pwd}</div>
              <div style={{ fontSize: 11, color: mut(0.5), marginTop: 4 }}>
                Ya está activa. Dile que entre con su email y la cambie en Ajustes → Contraseña.
              </div>
            </div>
          )}
          {link && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 4 }}>ENLACE DE ACCESO</div>
              <textarea
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                style={{ width: '100%', height: 62, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: 9, color: colors.text, fontFamily: 'monospace', fontSize: 10.5, outline: 'none' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => copy(link ?? pwd ?? '')}
              style={{ background: copied ? 'rgba(74,222,128,0.14)' : colors.surface1, color: copied ? colors.green : colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#04310f', border: 'none', borderRadius: 9, padding: '8px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
