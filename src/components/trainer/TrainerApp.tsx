import { useState } from 'react'
import { colors, mut } from '../../theme'
import type { Profile } from '../../lib/db'
import { Bell, Gear } from '../icons'
import Settings from '../Settings'
import Resumen from './Resumen'
import Clientes from './Clientes'
import ClienteDetalle from './ClienteDetalle'
import Biblioteca from './Biblioteca'

export type TrainerView = 'resumen' | 'clientes' | 'cliente' | 'biblioteca'
export type TrainerTab = 'evolucion' | 'fotos' | 'formularios' | 'agenda' | 'documentos'

interface Props {
  profile: Profile
  onSignOut: () => void
}

function initials(name: string | null): string {
  if (!name) return 'ET'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function TrainerApp({ profile, onSignOut }: Props) {
  const [showSettings, setShowSettings] = useState(false)
  const [tView, setTView] = useState<TrainerView>('clientes')
  const [tTab, setTTab] = useState<TrainerTab>('evolucion')
  const [selClientId, setSelClientId] = useState<string | null>(null)

  const resumenA = tView === 'resumen'
  const clientesA = tView === 'clientes' || tView === 'cliente'

  const navBtn = (active: boolean): React.CSSProperties => ({
    background: active ? colors.surface2 : 'transparent',
    border: 'none',
    borderRadius: 10,
    padding: '9px 16px',
    fontFamily: 'inherit',
    fontSize: 13.5,
    fontWeight: 600,
    color: active ? colors.text : mut(0.55),
    cursor: 'pointer',
  })

  const openClient = (id: string) => {
    setSelClientId(id)
    setTView('cliente')
    setTTab('evolucion')
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 22px 60px' }}>
      {/* top nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.surface1,
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '12px 20px',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <img src="/assets/ethos-logo.png" style={{ height: 34, width: 'auto' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTView('resumen')} style={navBtn(resumenA)}>
              Resumen
            </button>
            <button onClick={() => setTView('clientes')} style={navBtn(clientesA)}>
              Clientes
            </button>
            <button onClick={() => setTView('biblioteca')} style={navBtn(tView === 'biblioteca')}>
              Biblioteca
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Bell size={20} stroke={mut(0.55)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '5px 12px 5px 5px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#db1809,#7a0d04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {initials(profile.full_name)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.full_name || 'Entrenador'}</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="Ajustes"
            style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 11px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <Gear size={18} stroke={mut(0.7)} />
          </button>
        </div>
      </div>

      {tView === 'resumen' && <Resumen />}
      {tView === 'clientes' && <Clientes onOpen={openClient} />}
      {tView === 'biblioteca' && <Biblioteca />}
      {tView === 'cliente' && selClientId && (
        <ClienteDetalle clientId={selClientId} tTab={tTab} setTTab={setTTab} goClientes={() => setTView('clientes')} />
      )}

      {showSettings && <Settings profile={profile} onSignOut={onSignOut} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
