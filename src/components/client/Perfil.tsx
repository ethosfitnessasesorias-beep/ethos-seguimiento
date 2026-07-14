import { colors, mut } from '../../theme'
import { Mail, Phone, Pin } from '../icons'

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

export default function Perfil() {
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
          MR
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Marco Ríos</div>
          <div style={{ fontSize: 12.5, color: mut(0.5), marginTop: 3 }}>34 años · Plan Definición</div>
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
        <ContactRow icon={<Mail />} label="Email" value="marco.rios@correo.com" border />
        <ContactRow icon={<Phone />} label="Teléfono" value="+34 600 12 34 56" border />
        <ContactRow icon={<Pin />} label="Ciudad" value="Valencia, España" />
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginTop: 16 }}>
        <Stat value="178" unit=" cm" label="Altura" />
        <Stat value="83.6" unit=" kg" label="Peso actual" />
        <Stat value="80" unit=" kg" label="Objetivo" accent />
      </div>

      {/* lesiones */}
      <div style={sectionLabel(20)}>PERFIL DE LESIONES</div>
      <div style={{ ...card, padding: '15px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <InjuryChip>Hombro derecho · impingement</InjuryChip>
          <InjuryChip>Lumbalgia leve</InjuryChip>
        </div>
        <div style={{ fontSize: 12, color: mut(0.55), marginTop: 11, lineHeight: 1.5 }}>
          Evitar press militar con barra. Trabajo de core y movilidad de cadera 2×/sem.
        </div>
      </div>

      {/* patologías */}
      <div style={sectionLabel(18)}>PATOLOGÍAS Y ALERGIAS</div>
      <div style={{ ...card, padding: '15px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <NeutralChip>Hipertensión controlada</NeutralChip>
        <NeutralChip>Intolerancia a la lactosa</NeutralChip>
      </div>

      {/* objetivo */}
      <div style={{ ...card, padding: '15px 16px', marginTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.2, color: mut(0.4), fontWeight: 600, marginBottom: 6 }}>
          OBJETIVO PRINCIPAL
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
          Reducir grasa corporal manteniendo masa muscular de cara al verano.
        </div>
      </div>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  border,
}: {
  icon: React.ReactNode
  label: string
  value: string
  border?: boolean
}) {
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

function Stat({
  value,
  unit,
  label,
  accent,
}: {
  value: string
  unit: string
  label: string
  accent?: boolean
}) {
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
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: accent ? 'rgba(219,24,9,0.7)' : mut(0.5),
          }}
        >
          {unit}
        </span>
      </div>
      <div style={{ fontSize: 10, color: mut(0.45), marginTop: 2 }}>{label}</div>
    </div>
  )
}

function InjuryChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 500,
        background: 'rgba(219,24,9,0.12)',
        border: '1px solid rgba(219,24,9,0.3)',
        color: '#f5a99f',
        padding: '5px 11px',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}

function NeutralChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 500,
        background: colors.surface2,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '5px 11px',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}
