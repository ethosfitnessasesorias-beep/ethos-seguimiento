import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { Mail, Phone, Pin } from '../icons'
import type { Profile } from '../../lib/db'
import { getAdherenceStats, type AdherenceStats } from '../../lib/events'
import RegalosFidelidad from './RegalosFidelidad'

const sectionLabel = (mt = 14): React.CSSProperties => ({
  fontSize: 11,
  letterSpacing: 1.5,
  color: mut(0.4),
  fontWeight: 600,
  margin: `${mt}px 4px 9px`,
})

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
}

function initials(name: string | null): string {
  if (!name) return '·'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const dash = (v: unknown, suffix = '') => (v == null || v === '' ? '—' : `${v}${suffix}`)

const adhColor = (a: number) => (a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent)

function AdhBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: mut(0.6), fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: adhColor(pct) }}>
          {pct}% <span style={{ fontSize: 10.5, fontWeight: 500, color: mut(0.4) }}>{detail}</span>
        </span>
      </div>
      <div style={{ height: 8, background: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: adhColor(pct), borderRadius: 999 }} />
      </div>
    </div>
  )
}

export default function Perfil({ profile }: { profile: Profile }) {
  const p = profile
  const sub = [p.age ? `${p.age} años` : null, p.plan ? `Plan ${p.plan}` : null].filter(Boolean).join(' · ')
  const [stats, setStats] = useState<AdherenceStats | null>(null)

  useEffect(() => {
    getAdherenceStats(p.id).then(setStats).catch(() => {})
  }, [p.id])

  return (
    <div>
      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#db1809,#7a0d04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(219,24,9,0.3)',
          }}
        >
          {initials(p.full_name)}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{p.full_name || 'Tu nombre'}</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginTop: 3 }}>{sub || 'Completa tu perfil'}</div>
          <div
            style={{
              display: 'inline-block',
              marginTop: 7,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: colors.green,
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.25)',
              padding: '3px 9px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            ● Activo
          </div>
        </div>
      </div>

      {/* contacto */}
      <div style={sectionLabel(14)}>DATOS DE CONTACTO</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <ContactRow icon={<Mail />} label="Email" value={dash(p.email)} border />
        <ContactRow icon={<Phone />} label="Teléfono" value={dash(p.phone)} border />
        <ContactRow icon={<Pin />} label="Ciudad" value={dash(p.city)} />
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginTop: 16 }}>
        <Stat value={dash(p.height_cm)} unit={p.height_cm ? ' cm' : ''} label="Altura" />
        <Stat value={dash(p.current_weight)} unit={p.current_weight ? ' kg' : ''} label="Peso actual" />
        <Stat value={dash(p.target_weight)} unit={p.target_weight ? ' kg' : ''} label="Objetivo" accent />
      </div>

      {/* cumplimiento del plan */}
      <div style={{ ...card, padding: '15px 16px', marginTop: 12 }}>
        <AdhBar
          label="Cumplimiento · Esta semana"
          pct={stats?.weekPct ?? 0}
          detail={stats ? `${stats.weekCompleted}/${stats.weekTotal}` : ''}
        />
        <div style={{ height: 14 }} />
        <AdhBar
          label="Cumplimiento · Plan completo"
          pct={stats?.planPct ?? p.adherence ?? 0}
          detail={stats ? `${stats.planCompleted}/${stats.planTotal}` : ''}
        />
        <div style={{ fontSize: 10.5, color: mut(0.35), marginTop: 9 }}>Según los eventos que marcas como hechos en tu Agenda.</div>
      </div>

      {/* regalos de fidelidad */}
      <RegalosFidelidad clientId={p.id} startISO={p.created_at} />

      {/* lesiones */}
      <div style={sectionLabel(20)}>PERFIL DE LESIONES</div>
      <div style={{ ...card, padding: '15px 16px' }}>
        <div style={{ fontSize: 12.5, color: p.injuries ? mut(0.7) : mut(0.4), lineHeight: 1.5 }}>
          {p.injuries || 'Sin lesiones registradas. Tu entrenador completará esta ficha.'}
        </div>
      </div>

      {/* patologías */}
      <div style={sectionLabel(18)}>PATOLOGÍAS Y ALERGIAS</div>
      <div style={{ ...card, padding: '15px 16px' }}>
        <div style={{ fontSize: 12.5, color: p.pathologies ? mut(0.7) : mut(0.4), lineHeight: 1.5 }}>
          {p.pathologies || 'Sin patologías ni alergias registradas.'}
        </div>
      </div>

      {/* objetivo */}
      <div style={{ ...card, padding: '15px 16px', marginTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.2, color: mut(0.4), fontWeight: 600, marginBottom: 6 }}>
          OBJETIVO PRINCIPAL
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: p.main_goal ? colors.text : mut(0.45) }}>
          {p.main_goal || 'Aún no has definido tu objetivo principal.'}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: mut(0.3), margin: '18px 0 4px' }}>
        La edición del perfil llegará en la próxima actualización.
      </div>
    </div>
  )
}

function ContactRow({ icon, label, value, border }: { icon: React.ReactNode; label: string; value: string; border?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        borderBottom: border ? '1px solid rgba(255,255,255,0.05)' : undefined,
      }}
    >
      {icon}
      <div>
        <div style={{ fontSize: 10, color: mut(0.4) }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

function Stat({ value, unit, label, accent }: { value: string; unit: string; label: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: colors.surface1,
        border: accent ? '1px solid rgba(219,24,9,0.35)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '14px 10px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? colors.accent : undefined }}>
        {value}
        <span style={{ fontSize: 11, fontWeight: 500, color: accent ? 'rgba(219,24,9,0.7)' : mut(0.5) }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10, color: mut(0.45), marginTop: 2 }}>{label}</div>
    </div>
  )
}
