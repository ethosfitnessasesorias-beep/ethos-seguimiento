import { useEffect } from 'react'
import { colors, mut } from '../../theme'
import type { Profile } from '../../lib/db'
import { markAllNotificationsRead, personalize, type NotificationItem } from '../../lib/messages'
import Modal from '../Modal'

interface Props {
  profile: Profile
  items: NotificationItem[]
  onClose: () => void
}

export default function Notificaciones({ profile, items, onClose }: Props) {
  // Al abrir, marca todo como leído.
  useEffect(() => {
    if (items.some((m) => !m.read)) markAllNotificationsRead(profile.id).catch(() => {})
  }, [profile.id, items])

  return (
    <Modal title="Notificaciones" onClose={onClose}>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: mut(0.45), textAlign: 'center', padding: '24px 0' }}>
          No tienes mensajes por ahora.
        </div>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="om-scroll">
          {items.map((m) => (
            <div
              key={m.id}
              style={{
                background: colors.surface2,
                border: `1px solid ${m.read ? 'rgba(255,255,255,0.06)' : 'rgba(219,24,9,0.35)'}`,
                borderRadius: 12,
                padding: '13px 14px',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5 }}>{personalize(m.body, profile.full_name)}</div>
              <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 6 }}>{m.date}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
