// Función de servidor (Vercel) que envía las notificaciones "de hoy" por
// email (Resend) y push (Web Push). La dispara un cron externo una vez al día.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — base de datos (service_role = SECRETO)
//   RESEND_API_KEY, RESEND_FROM               — emails (opcional)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT  — push (opcional)
//   CRON_SECRET                               — protege el endpoint
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function todayISO(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
function weeksBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / (7 * 86400000))
}
function personalize(body: string, name: string | null): string {
  return body.replace(/\{nombre\}/gi, name?.split(' ')[0] || 'crack')
}

const EMAIL_ENABLED = !!process.env.RESEND_API_KEY
const PUSH_ENABLED = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
if (PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:no-reply@ethosfitnessasesorias.es',
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )
}

async function sendEmail(to: string, subject: string, text: string) {
  const from = process.env.RESEND_FROM || 'ETHOS GYM <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

interface Req { headers: Record<string, string | undefined> }
interface Res { status: (n: number) => Res; json: (b: unknown) => void }

export default async function handler(req: Req, res: Res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'no autorizado' })
  }

  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  })

  const today = todayISO()
  let emails = 0
  let pushes = 0
  const errors: string[] = []

  const clientInfo = async (clientId: string) => {
    const { data } = await supabase.from('profiles').select('email, full_name').eq('id', clientId).maybeSingle()
    return { email: data?.email ?? null, name: data?.full_name ?? null }
  }

  const sendPush = async (clientId: string, title: string, body: string) => {
    if (!PUSH_ENABLED) return
    const { data: subs } = await supabase.from('push_subscriptions').select('id, subscription').eq('client_id', clientId)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription as webpush.PushSubscription, JSON.stringify({ title, body }))
        pushes++
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }

  // Entrega por todos los canales disponibles.
  const deliver = async (clientId: string, body: string) => {
    const { email, name } = await clientInfo(clientId)
    const text = personalize(body, name)
    if (EMAIL_ENABLED && email) {
      await sendEmail(email, 'ETHOS GYM · Mensaje de tu entrenador', text)
      emails++
    }
    await sendPush(clientId, 'ETHOS GYM', text)
  }

  // 1) Mensajes puntuales vencidos y no enviados.
  const { data: oneOffs } = await supabase
    .from('messages')
    .select('id, client_id, body')
    .lte('send_date', today)
    .is('notified_at', null)
  for (const m of oneOffs ?? []) {
    try {
      await deliver(m.client_id, m.body)
      await supabase.from('messages').update({ notified_at: new Date().toISOString() }).eq('id', m.id)
    } catch (e) {
      errors.push(`msg ${m.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 2) Mensajes recurrentes que tocan hoy.
  const { data: schedules } = await supabase
    .from('message_schedules')
    .select('id, client_id, body, weekday, interval_weeks, start_date, end_date')
  for (const s of schedules ?? []) {
    try {
      if (s.end_date && today > s.end_date) continue
      if (today < s.start_date) continue
      if (weekdayOf(today) !== s.weekday) continue
      const w = weeksBetween(s.start_date, today)
      if (w < 0 || w % Math.max(1, s.interval_weeks) !== 0) continue
      const { data: already } = await supabase
        .from('schedule_sends')
        .select('id')
        .eq('schedule_id', s.id)
        .eq('send_date', today)
        .maybeSingle()
      if (already) continue
      await deliver(s.client_id, s.body)
      await supabase.from('schedule_sends').insert({ schedule_id: s.id, send_date: today })
    } catch (e) {
      errors.push(`sched ${s.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  return res.status(200).json({ ok: true, date: today, emails, pushes, errors, channels: { email: EMAIL_ENABLED, push: PUSH_ENABLED } })
}
