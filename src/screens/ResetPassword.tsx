import { useState } from 'react'
import { colors, mut } from '../theme'
import { useAuth } from '../lib/auth'

// Pantalla para fijar una contraseña nueva tras pulsar el enlace del correo.
export default function ResetPassword() {
  const { updatePassword, clearRecovery } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const save = async () => {
    if (pw.length < 6) return setMsg('La contraseña debe tener al menos 6 caracteres.')
    if (pw !== pw2) return setMsg('Las contraseñas no coinciden.')
    setBusy(true)
    setMsg(null)
    try {
      await updatePassword(pw)
      setDone(true)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  const input: React.CSSProperties = {
    width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    padding: '13px 14px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none',
  }
  const label: React.CSSProperties = { fontSize: 11, letterSpacing: 0.5, color: mut(0.5), fontWeight: 600, marginBottom: 6, display: 'block' }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 52 }} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: mut(0.45), fontWeight: 600, marginTop: 10 }}>ETHOS GYM · SEGUIMIENTO</div>
        </div>

        <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 22 }}>
          {done ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>¡Contraseña actualizada! ✓</div>
              <div style={{ fontSize: 13, color: mut(0.55), marginBottom: 18, lineHeight: 1.5 }}>Ya puedes usar la app con tu nueva contraseña.</div>
              <button onClick={clearRecovery} style={{ width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Entrar
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Nueva contraseña</div>
              <div style={{ fontSize: 12.5, color: mut(0.5), marginBottom: 18 }}>Elige la contraseña con la que entrarás a partir de ahora.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="new-pw" style={label}>NUEVA CONTRASEÑA</label>
                  <input id="new-pw" name="password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={input} />
                </div>
                <div>
                  <label htmlFor="new-pw2" style={label}>REPITE LA CONTRASEÑA</label>
                  <input id="new-pw2" name="password2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" style={input} />
                </div>
                {msg && <div style={{ fontSize: 12.5, color: '#f5a99f' }}>{msg}</div>}
                <button onClick={save} disabled={busy} style={{ width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
