import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import type { Profile } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { listNotifications, type NotificationItem } from '../../lib/messages'
import { Bell, User, Pulse, BarChart, Calendar, FileIcon, Clipboard, Gear } from '../icons'
import Settings from '../Settings'
import Perfil from './Perfil'
import Metricas from './Metricas'
import Analisis from './Analisis'
import Agenda from './Agenda'
import Documentos from './Documentos'
import Formularios from './Formularios'
import Notificaciones from './Notificaciones'
import InstallPrompt from './InstallPrompt'
import NotifPrompt from './NotifPrompt'

export type ClientTab = 'perfil' | 'metricas' | 'analisis' | 'calendario' | 'formularios' | 'documentos'

const titles: Record<ClientTab, string> = {
  perfil: 'Perfil',
  metricas: 'Métricas',
  analisis: 'Análisis',
  calendario: 'Agenda',
  formularios: 'Formularios',
  documentos: 'Documentos',
}

interface Props {
  profile: Profile
  onSignOut: () => void
}

export default function ClientApp({ profile, onSignOut }: Props) {
  const { refreshProfile } = useAuth()
  const [cTab, setCTab] = useState<ClientTab>('perfil')
  const [openFormType, setOpenFormType] = useState<'reporte' | 'cambio' | null>(null)
  const [messages, setMessages] = useState<NotificationItem[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const loadMessages = () => {
    listNotifications(profile).then(setMessages).catch(() => {})
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadMessages, [profile.id, profile.messages_read_until])
  const unread = messages.filter((m) => !m.read).length

  const openForm = (formType: 'reporte' | 'cambio') => {
    setOpenFormType(formType)
    setCTab('formularios')
  }

  const tabColor = (k: ClientTab) => (cTab === k ? colors.accent : mut(0.45))
  const tabs: { key: ClientTab; label: string; icon: React.ReactNode }[] = [
    { key: 'perfil', label: 'Perfil', icon: <User /> },
    { key: 'metricas', label: 'Métricas', icon: <Pulse /> },
    { key: 'analisis', label: 'Análisis', icon: <BarChart /> },
    { key: 'calendario', label: 'Agenda', icon: <Calendar /> },
    { key: 'formularios', label: 'Forms', icon: <Clipboard /> },
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
            <div style={{ position: 'relative' }}>
              <IconCircle onClick={() => setShowNotif(true)} title="Notificaciones">
                <Bell size={18} />
              </IconCircle>
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: colors.accent, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #080808' }}>
                  {unread}
                </span>
              )}
            </div>
            <IconCircle onClick={() => setShowSettings(true)} title="Ajustes">
              <Gear size={18} />
            </IconCircle>
          </div>
        </div>

        {/* scroll body */}
        <div className="om-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 26px' }}>
          <InstallPrompt />
          <NotifPrompt clientId={profile.id} />
          {cTab === 'perfil' && <Perfil profile={profile} />}
          {cTab === 'metricas' && <Metricas profile={profile} />}
          {cTab === 'analisis' && <Analisis clientId={profile.id} />}
          {cTab === 'calendario' && <Agenda clientId={profile.id} onOpenForm={openForm} onAdherenceChange={refreshProfile} />}
          {cTab === 'formularios' && (
            <Formularios profile={profile} initialFormType={openFormType} onConsumed={() => setOpenFormType(null)} />
          )}
          {cTab === 'documentos' && <Documentos clientId={profile.id} />}
        </div>

        {/* bottom tab bar */}
        <div
          style={{
            flex: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(6,1fr)',
            padding: '10px 4px calc(14px + env(safe-area-inset-bottom))',
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

      {showNotif && (
        <Notificaciones
          profile={profile}
          items={messages}
          onClose={() => {
            setShowNotif(false)
            refreshProfile()
          }}
        />
      )}

      {showSettings && <Settings profile={profile} onSignOut={onSignOut} onClose={() => setShowSettings(false)} />}
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
