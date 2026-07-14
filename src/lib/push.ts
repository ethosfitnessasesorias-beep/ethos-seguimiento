import { supabase } from './supabase'

// Clave pública VAPID (es pública por diseño; la privada va en el servidor).
export const VAPID_PUBLIC_KEY =
  'BKtH4ooUXpEU0EvbG1LhcliJKZpAZKxwrMwvzUNGbF5HSXoruEQOY21Iv0BO4e44l3OG6IHNsZkCnmvQH0Y1er4'

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Cancela la suscripción push de este dispositivo. */
export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch {
    // ignorar
  }
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'error'

/** Pide permiso y suscribe el navegador del cliente a las notificaciones push. */
export async function enablePush(clientId: string): Promise<EnableResult> {
  if (!pushSupported()) return 'unsupported'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      }))
    await supabase
      .from('push_subscriptions')
      .upsert({ client_id: clientId, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' })
    return 'ok'
  } catch {
    return 'error'
  }
}
