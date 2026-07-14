import { useState } from 'react'
import { colors, mut } from '../../theme'
import type { Profile } from '../../lib/db'
import { Bell, User, Pulse, BarChart, Calendar, FileIcon } from '../icons'
import Perfil from './Perfil'
import Metricas from './Metricas'
import Analisis from './Analisis'
import Agenda from './Agenda'
import Documentos from './Documentos'

export type ClientTab = 'perfil' | 'metricas' | 'analisis' | 'calendario' | 'documentos'

const titles: Record<ClientTab, string> = {
  perfil: 'Perfil',
  metricas: 'Métricas',
  analisis: 'Análisis',
  calendario: 'Agenda',
  documentos: 'Documentos',
}

interface Props {
  profile: Profile
  onSignOut: () => void
}

export default function ClientApp({ profile, onSignOut }: Props) {
  const [cTab, setCTab] = useState<ClientTab>('perfil')
  const [calDay, setCalDay] = useState(13)

  const tabColor = (k: ClientTab) => (cTab === k ? colors.accent : mut(0.45))
  const tabs: { key: ClientTab; label: string; icon: React.ReactNode }[] = [
    { key: 'perfil', label: 'Perfil', icon: <User /> },
    { key: 'metricas', label: 'Métricas', icon: <Pulse /> },
    { key: 'analisis', label: 'Análisis', icon: <BarChart /> },
    { key: 'calendario', label: 'Agenda', icon: <Calendar /> },
    { key: 'documentos', label: 'Docs', icon: <FileIcon size={22} stroke="currentColor" /> },
  ]

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        background: 'radial-gradient(900px 500px at 50% -10%, #161616 0%, #080808 55%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100dvh',
          background: colors.bg,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {/* header */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'max(14px, env(safe-area-inset-top)) 20px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/ethos-logo.png" style={{ height: 30, width: 'auto' }} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 9, letterSpacing: 2.5, color: mut(0.45), fontWeight: 600 }}>ETHOS GYM</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{titles[cTab]}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconCircle>
              <Bell size={18} />
            </IconCircle>
            <IconCircle onClick={onSignOut} title="Cerrar sesión">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </IconCircle>
          </div>
        </div>

        {/* scroll body */}
        <div className="om-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 26px' }}>
          {cTab === 'perfil' && <Perfil profile={profile} />}
          {cTab === 'metricas' && <Metricas clientId={profile.id} />}
          {cTab === 'analisis' && <Analisis />}
          {cTab === 'calendario' && <Agenda calDay={calDay} setCalDay={setCalDay} />}
          {cTab === 'documentos' && <Documentos />}
        </div>

        {/* bottom tab bar */}
        <div
          style={{
            flex: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(5,1fr)',
            padding: '10px 8px calc(14px + env(safe-area-inset-bottom))',
            background: 'rgba(13,13,13,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setCTab(t.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tabColor(t.key) }}
            >
              {t.icon}
              <span style={{ fontSize: 9.5, fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function IconCircle({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: colors.surface2,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}
