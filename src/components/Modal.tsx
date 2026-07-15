import { useEffect, useState, type ReactNode } from 'react'
import { colors, mut } from '../theme'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

// Sigue el "visual viewport" para que, al abrirse el teclado del móvil, el
// panel suba por encima de él y no tape los campos.
function useVisualViewport() {
  const [vp, setVp] = useState({ height: window.innerHeight, top: 0 })
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setVp({ height: vv.height, top: vv.offsetTop })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return vp
}

export default function Modal({ title, onClose, children }: Props) {
  const vp = useVisualViewport()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        left: 0,
        top: vp.top,
        width: '100%',
        height: vp.height,
        zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '100%',
          overflowY: 'auto',
          background: colors.surface1,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '22px 22px 0 0',
          padding: '20px 20px 24px',
          animation: 'sheet-up .18s ease-out',
        }}
        className="om-scroll"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'sticky', top: 0, background: colors.surface1, zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: colors.surface2, border: 'none', borderRadius: 999, width: 30, height: 30, color: mut(0.6), cursor: 'pointer', fontSize: 15 }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
