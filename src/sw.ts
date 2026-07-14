/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

// `self` en un service worker.
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }

// Precarga de la app (lo genera vite-plugin-pwa).
precacheAndRoute(self.__WB_MANIFEST as never)

// Notificación push recibida → mostrarla.
self.addEventListener('push', (event: PushEvent) => {
  let title = 'ETHOS GYM'
  let body = ''
  try {
    if (event.data) {
      const d = event.data.json() as { title?: string; body?: string }
      title = d.title || title
      body = d.body || ''
    }
  } catch {
    if (event.data) body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
    }),
  )
})

// Al pulsar la notificación → abrir / enfocar la app.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return (c as WindowClient).focus()
      }
      return self.clients.openWindow('/')
    }),
  )
})
