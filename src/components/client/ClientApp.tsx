import { colors, mut } from '../../theme'
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
  cTab: ClientTab
  setCTab: (t: ClientTab) => void
  calDay: number
  setCalDay: (d: number) => void
}

export default function ClientApp({ cTab, setCTab, calDay, setCalDay }: Props) {
  const tabColor = (k: ClientTab) => (cTab === k ? colors.accent : mut(0.45))

  const tabs: { key: ClientTab; label: string; icon: React.ReactNode }[] = [
    { key: 'perfil', label: 'Perfil', icon: <User /> },
    { key: 'metricas', label: 'Métricas', icon: <Pulse /> },
    { key: 'analisis', label: 'Análisis', icon: <BarChart /> },
    { key: 'calendario', label: 'Agenda', icon: <Calendar /> },
    { key: 'documentos', label: 'Docs', icon: <FileIcon size={22} stroke="currentColor" /> },
  ]

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 392,
          height: 812,
          background: colors.bg,
          border: '10px solid #1c1c1c',
          borderRadius: 52,
          boxShadow: '0 30px 90px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* status bar */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 26px 6px',
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          <span>9:41</span>
          <div style={{ width: 110, height: 26, background: colors.bg }} />
          <span style={{ letterSpacing: 1 }}>5G ▪ 100%</span>
        </div>

        {/* app header */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 22px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/ethos-logo.png" style={{ height: 30, width: 'auto' }} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 9, letterSpacing: 2.5, color: mut(0.45), fontWeight: 600 }}>
                ETHOS GYM
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{titles[cTab]}</div>
            </div>
          </div>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: colors.surface2,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} />
          </div>
        </div>

        {/* scroll body */}
        <div className="om-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 26px' }}>
          {cTab === 'perfil' && <Perfil />}
          {cTab === 'metricas' && <Metricas />}
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
            padding: '10px 8px 22px',
            background: 'rgba(13,13,13,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setCTab(t.key)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                color: tabColor(t.key),
              }}
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
