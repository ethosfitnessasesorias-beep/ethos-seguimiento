import { useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import { updateProfile, type Profile } from '../../lib/db'
import {
  CONTRACT_ACCEPT_TEXT,
  CONTRACT_SECTIONS,
  CONTRACT_TITLE,
  CONTRACT_VERSION,
} from '../../lib/contract'

// Pantalla que bloquea la app hasta que el cliente firma el contrato.
export default function ContratoGate({ profile, onSigned }: { profile: Profile; onSigned: () => Promise<void> }) {
  const [name, setName] = useState(profile.full_name ?? '')
  const [dni, setDni] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [readBottom, setReadBottom] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setReadBottom(true)
  }

  const canSign = accepted && readBottom && name.trim().length > 2 && dni.trim().length >= 6 && !busy

  const sign = async () => {
    setErr(null)
    if (!name.trim() || name.trim().length < 3) return setErr('Escribe tu nombre y apellidos completos.')
    if (dni.trim().length < 6) return setErr('Introduce un DNI/NIE válido.')
    if (!accepted) return setErr('Debes marcar la casilla de aceptación.')
    setBusy(true)
    try {
      await updateProfile(profile.id, {
        contract_signed_at: new Date().toISOString(),
        contract_signature_name: name.trim(),
        contract_dni: dni.trim().toUpperCase(),
        contract_version: CONTRACT_VERSION,
      })
      await onSigned()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo registrar la firma.')
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: colors.bg, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        {/* cabecera */}
        <div style={{ flex: 'none', padding: 'max(18px, env(safe-area-inset-top)) 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <img src="/assets/ethos-logo.png" alt="" style={{ height: 30 }} />
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: mut(0.45), fontWeight: 600 }}>ETHOS GYM</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Antes de empezar, firma tu contrato</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginTop: 4, lineHeight: 1.5 }}>
            Lee el contrato completo hasta el final. Solo podrás acceder a la app cuando esté firmado.
          </div>
        </div>

        {/* cuerpo del contrato (scroll) */}
        <div ref={scrollRef} onScroll={onScroll} className="om-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, marginBottom: 18, color: mut(0.85) }}>{CONTRACT_TITLE}</div>
          {CONTRACT_SECTIONS.map((s) => (
            <div key={s.h} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 7 }}>{s.h}</div>
              {s.p.map((par, i) => (
                <p key={i} style={{ fontSize: 12.5, lineHeight: 1.65, color: mut(0.7), margin: '0 0 8px' }}>{par}</p>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: mut(0.4), textAlign: 'center', padding: '10px 0 4px' }}>— Fin del contrato —</div>
        </div>

        {/* firma */}
        <div style={{ flex: 'none', borderTop: '1px solid rgba(255,255,255,0.09)', background: colors.surface1, padding: '16px 20px calc(16px + env(safe-area-inset-bottom))' }}>
          {!readBottom && (
            <div style={{ fontSize: 11.5, color: colors.amber, marginBottom: 12, textAlign: 'center' }}>
              ▲ Desplázate y lee el contrato hasta el final para poder firmar.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <SignField label="Nombre y apellidos" value={name} onChange={setName} placeholder="Tu nombre completo" />
            <SignField label="DNI / NIE" value={dni} onChange={setDni} placeholder="00000000A" />
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 14 }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17, accentColor: colors.accent, flex: 'none' }} />
            <span style={{ fontSize: 11.5, color: mut(0.7), lineHeight: 1.55 }}>{CONTRACT_ACCEPT_TEXT}</span>
          </label>
          {err && <div style={{ fontSize: 12, color: '#f5a99f', marginBottom: 10 }}>{err}</div>}
          <button
            onClick={sign}
            disabled={!canSign}
            style={{ width: '100%', background: canSign ? colors.accent : colors.surface2, color: canSign ? '#fff' : mut(0.4), border: 'none', borderRadius: 12, padding: 15, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: canSign ? 'pointer' : 'not-allowed' }}
          >
            {busy ? 'Firmando…' : 'Firmar y aceptar el contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SignField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10.5, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </label>
  )
}
