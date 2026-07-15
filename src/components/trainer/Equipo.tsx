import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { getTeamSummary, type TeamRow } from '../../lib/dashboard'
import { createTrainer } from '../../lib/invites'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

function initials(name: string | null): string {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function Equipo({ myId }: { myId: string }) {
  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const load = () => {
    setLoading(true)
    getTeamSummary()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error al cargar el equipo.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const totalClients = rows.reduce((s, r) => s + r.clients, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Equipo</div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
        >
          + Añadir entrenador
        </button>
      </div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Cada entrenador ve solo sus clientes. Aquí tenéis el resumen de todo el equipo.
      </div>

      {addOpen && <AddTrainerModal onClose={() => setAddOpen(false)} onCreated={load} />}

      {err && (
        <div style={{ fontSize: 13, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          {err} <span style={{ color: mut(0.5) }}>(¿ejecutaste el SQL de esta versión?)</span>
        </div>
      )}

      {!loading && !err && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 22 }}>
          <Kpi label="Entrenadores" value={String(rows.length)} />
          <Kpi label="Clientes totales" value={String(totalClients)} />
          <Kpi label="Adherencia media equipo" value={`${rows.length ? Math.round(rows.reduce((s, r) => s + r.avg_adherence, 0) / rows.length) : 0}%`} />
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4) }}>Cargando…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {rows.map((r) => (
            <div key={r.trainer_id} style={{ ...card, padding: 20, border: r.trainer_id === myId ? '1px solid rgba(219,24,9,0.4)' : card.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                  {initials(r.trainer_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {r.trainer_name || 'Entrenador'}
                    {r.trainer_id === myId && <span style={{ fontSize: 10, color: colors.accent, marginLeft: 8, fontWeight: 600 }}>· tú</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>{r.clients} {r.clients === 1 ? 'cliente' : 'clientes'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat label="Adherencia media" value={`${r.avg_adherence}%`} color={adhColor(r.avg_adherence)} />
                <Stat label="Permanencia media" value={`${r.avg_months} m`} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: mut(0.35), marginTop: 22, lineHeight: 1.6 }}>
        Cada entrenador que crees entra con su email y su contraseña, y arranca con su propia lista de clientes vacía. La reasignación de clientes entre entrenadores llegará en una mejora posterior.
      </div>
    </div>
  )
}

function AddTrainerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ email: string; pw: string } | null>(null)

  const submit = async () => {
    setErr(null)
    if (!email.trim() || !email.includes('@')) return setErr('Introduce un email válido.')
    if (pw.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.')
    setBusy(true)
    try {
      await createTrainer(email.trim().toLowerCase(), pw, name.trim() || null)
      setDone({ email: email.trim().toLowerCase(), pw })
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear el entrenador.')
    } finally {
      setBusy(false)
    }
  }

  const suggest = () => {
    // Contraseña temporal legible: ethos + 4 dígitos a partir de la longitud del email (sin aleatorio).
    const n = ((email.length * 37 + name.length * 13) % 9000) + 1000
    setPw('ethos' + n)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: colors.surface1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 22 }}>
        {done ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Entrenador creado ✓</div>
            <div style={{ fontSize: 13, color: mut(0.55), marginBottom: 16, lineHeight: 1.6 }}>
              Comparte estas credenciales con {name.trim() || 'el nuevo entrenador'}. Podrá cambiar la contraseña desde Ajustes.
            </div>
            <div style={{ background: colors.surface2, borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 13.5, lineHeight: 1.9 }}>
              <div><span style={{ color: mut(0.45) }}>Email:</span> <b>{done.email}</b></div>
              <div><span style={{ color: mut(0.45) }}>Contraseña:</span> <b>{done.pw}</b></div>
            </div>
            <button onClick={onClose} style={{ width: '100%', background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: 13, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Hecho
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Nuevo entrenador</div>
            <div style={{ fontSize: 12.5, color: mut(0.5), marginBottom: 18 }}>Se crea su cuenta al instante, ya activada.</div>

            <MField label="Nombre y apellidos" value={name} onChange={setName} placeholder="Ej. Laura Gómez" />
            <MField label="Email" value={email} onChange={setEmail} placeholder="entrenador@correo.com" type="email" />
            <div style={{ marginBottom: 4 }}>
              <MField label="Contraseña temporal" value={pw} onChange={setPw} placeholder="mínimo 6 caracteres" />
              <button onClick={suggest} style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0 0', fontFamily: 'inherit' }}>
                Sugerir contraseña
              </button>
            </div>

            {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 8, marginBottom: 4 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={onClose} disabled={busy} style={{ flex: 1, background: colors.surface2, color: mut(0.7), border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: 12, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={submit} disabled={busy} style={{ flex: 1, background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Creando…' : 'Crear entrenador'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        style={{ width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 13px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </label>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: mut(0.5) }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: colors.surface2, borderRadius: 12, padding: '12px 13px' }}>
      <div style={{ fontSize: 10.5, color: mut(0.45) }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color }}>{value}</div>
    </div>
  )
}
