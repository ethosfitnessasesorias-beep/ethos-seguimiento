import { colors, mut } from '../../theme'
import { Bell } from '../icons'
import Resumen from './Resumen'
import Clientes from './Clientes'
import ClienteDetalle from './ClienteDetalle'

export type TrainerView = 'resumen' | 'clientes' | 'cliente'
export type TrainerTab = 'evolucion' | 'fotos' | 'formularios'

interface Props {
  tView: TrainerView
  setTView: (v: TrainerView) => void
  tTab: TrainerTab
  setTTab: (t: TrainerTab) => void
  selIdx: number
  setSelIdx: (i: number) => void
}

export default function TrainerApp({ tView, setTView, tTab, setTTab, selIdx, setSelIdx }: Props) {
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

  const openClient = (idx: number) => {
    setSelIdx(idx)
    setTView('cliente')
    setTTab('evolucion')
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 22px' }}>
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
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Bell size={20} stroke={mut(0.55)} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: colors.surface2,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 999,
              padding: '5px 12px 5px 5px',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#db1809,#7a0d04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              LS
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Luis Silva</span>
          </div>
        </div>
      </div>

      {tView === 'resumen' && <Resumen />}
      {tView === 'clientes' && <Clientes onOpen={openClient} />}
      {tView === 'cliente' && (
        <ClienteDetalle
          selIdx={selIdx}
          tTab={tTab}
          setTTab={setTTab}
          goClientes={() => setTView('clientes')}
        />
      )}
    </div>
  )
}
