import type { ReactNode } from 'react'
import { colors, mut } from '../theme'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
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
          background: colors.surface1,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '22px 22px 0 0',
          padding: '20px 20px 28px',
          animation: 'sheet-up .18s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
