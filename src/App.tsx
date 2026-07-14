import { useState } from 'react'
import { colors } from './theme'
import ClientApp, { type ClientTab } from './components/client/ClientApp'
import TrainerApp, { type TrainerView, type TrainerTab } from './components/trainer/TrainerApp'

export type Mode = 'client' | 'trainer'

export default function App() {
  const [mode, setMode] = useState<Mode>('client')

  // Client app state
  const [cTab, setCTab] = useState<ClientTab>('perfil')
  const [calDay, setCalDay] = useState(13)

  // Trainer app state
  const [tView, setTView] = useState<TrainerView>('resumen')
  const [tTab, setTTab] = useState<TrainerTab>('evolucion')
  const [selIdx, setSelIdx] = useState(0)

  const seg = (active: boolean): React.CSSProperties => ({
    background: active ? colors.accent : 'transparent',
    color: active ? '#fff' : 'rgba(245,245,245,0.55)',
    border: 'none',
    borderRadius: 999,
    padding: '7px 18px',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  })

  return (
    <div className="app-shell">
      {/* ===== MODE SWITCHER ===== */}
      <div
        style={{
          position: 'fixed',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(17,17,17,0.82)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 999,
          padding: '6px 8px 6px 16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        <img src="/assets/ethos-logo.png" alt="ETHOS GYM" style={{ height: 26, width: 'auto', opacity: 0.95 }} />
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 999, padding: 4 }}>
          <button onClick={() => setMode('client')} style={seg(mode === 'client')}>
            Cliente
          </button>
          <button onClick={() => setMode('trainer')} style={seg(mode === 'trainer')}>
            Entrenador
          </button>
        </div>
      </div>

      {mode === 'client' ? (
        <ClientApp cTab={cTab} setCTab={setCTab} calDay={calDay} setCalDay={setCalDay} />
      ) : (
        <TrainerApp
          tView={tView}
          setTView={setTView}
          tTab={tTab}
          setTTab={setTTab}
          selIdx={selIdx}
          setSelIdx={setSelIdx}
        />
      )}
    </div>
  )
}
