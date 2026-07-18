// Función de servidor (Vercel) que envía las notificaciones que "tocan ahora"
// por email (Resend) y push (Web Push).
//
// La llaman:
//  - un cron externo (cron-job.org) cada ~15 min con la cabecera del CRON_SECRET,
//  - o la propia app (sesión del entrenador) al pulsar "Enviar ahora".
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM,
//  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Variables de entorno del servidor (Vercel). Se declara aquí para no depender
// de @types/node en la compilación de las funciones.
declare const process: { env: Record<string, string | undefined> }

const TZ = 'Europe/Madrid'

function madridNow(): { date: string; hhmm: string; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const date = `${g('year')}-${g('month')}-${g('day')}`
  let hh = g('hour')
  if (hh === '24') hh = '00'
  const hhmm = `${hh}:${g('minute')}`
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return { date, hhmm, weekday }
}
function weeksBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / (7 * 86400000))
}
function personalize(body: string, name: string | null): string {
  return body.replace(/\{nombre\}/gi, name?.split(' ')[0] || 'crack')
}
// ¿Ya ha llegado la hora de envío? (send_time null = sin restricción)
function timeReached(sendTime: string | null, nowHHMM: string): boolean {
  return !sendTime || nowHHMM >= sendTime
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
  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  })

  // Autorización: cron (CRON_SECRET) o un entrenador con sesión válida.
  const auth = req.headers['authorization']
  let authorized = false
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) authorized = true
  else if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const { data } = await supabase.auth.getUser(token)
    if (data.user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (prof?.role === 'trainer') authorized = true
    }
  }
  if (secret && !authorized) return res.status(401).json({ error: 'no autorizado' })

  const { date: today, hhmm, weekday } = madridNow()
  let emails = 0
  let pushes = 0
  const errors: string[] = []

  const clientInfo = async (clientId: string) => {
    const { data } = await supabase.from('profiles').select('email, full_name').eq('id', clientId).maybeSingle()
    return { email: data?.email ?? null, name: data?.full_name ?? null }
  }

  const sendPush = async (clientId: string, title: string, body: string): Promise<number> => {
    if (!PUSH_ENABLED) return 0
    const { data: subs } = await supabase.from('push_subscriptions').select('id, subscription').eq('client_id', clientId)
    let n = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription as webpush.PushSubscription, JSON.stringify({ title, body }))
        pushes++
        n++
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
        else errors.push(`push ${clientId}: ${e instanceof Error ? e.message : e}`)
      }
    }
    return n
  }

  const deliver = async (clientId: string, body: string): Promise<boolean> => {
    const { email, name } = await clientInfo(clientId)
    const text = personalize(body, name)
    let ok = false
    if (EMAIL_ENABLED && email) {
      try {
        await sendEmail(email, 'ETHOS GYM · Mensaje de tu entrenador', text)
        emails++
        ok = true
      } catch (e) {
        errors.push(`email ${clientId}: ${e instanceof Error ? e.message : e}`)
      }
    }
    try {
      if ((await sendPush(clientId, 'ETHOS GYM', text)) > 0) ok = true
    } catch (e) {
      errors.push(`push ${clientId}: ${e instanceof Error ? e.message : e}`)
    }
    return ok
  }

  // 1) Mensajes puntuales: vencidos y no enviados, respetando su hora.
  const { data: oneOffs } = await supabase
    .from('messages')
    .select('id, client_id, body, send_date, send_time')
    .lte('send_date', today)
    .is('notified_at', null)
  for (const m of oneOffs ?? []) {
    // Si es de un día anterior, se envía ya. Si es de hoy, espera a su hora.
    if (m.send_date === today && !timeReached(m.send_time, hhmm)) continue
    const ok = await deliver(m.client_id, m.body)
    if (ok) await supabase.from('messages').update({ notified_at: new Date().toISOString() }).eq('id', m.id)
  }

  // 2) Mensajes recurrentes que tocan hoy, respetando su hora.
  const { data: schedules } = await supabase
    .from('message_schedules')
    .select('id, client_id, body, weekday, interval_weeks, start_date, end_date, send_time')
  for (const s of schedules ?? []) {
    try {
      if (s.end_date && today > s.end_date) continue
      if (today < s.start_date) continue
      if (weekday !== s.weekday) continue
      if (!timeReached(s.send_time, hhmm)) continue
      const w = weeksBetween(s.start_date, today)
      if (w < 0 || w % Math.max(1, s.interval_weeks) !== 0) continue
      const { data: already } = await supabase
        .from('schedule_sends')
        .select('id')
        .eq('schedule_id', s.id)
        .eq('send_date', today)
        .maybeSingle()
      if (already) continue
      const ok = await deliver(s.client_id, s.body)
      if (ok) await supabase.from('schedule_sends').insert({ schedule_id: s.id, send_date: today })
    } catch (e) {
      errors.push(`sched ${s.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 3) Recordatorio CON ANTELACIÓN (el día antes) de tareas importantes:
  //    formularios, registros de métricas y envíos al coach. NO avisa de entrenos.
  const TYPE_LABEL: Record<string, string> = {
    reporte: 'rellenar tu reporte',
    cambio: 'rellenar el cambio de planificación',
    encuesta: 'rellenar la encuesta de satisfacción',
    nutricion: 'rellenar tu registro nutricional',
    peso: 'registrar tu peso',
    perimetros: 'registrar tus perímetros',
    fotos: 'subir tus fotos de progreso',
    video: 'enviar tus vídeos al coach',
    comida: 'enviar la foto de tu comida',
  }
  const REMIND_TYPES = Object.keys(TYPE_LABEL)
  // Mañana en horario de Madrid.
  const [ty, tm, td] = today.split('-').map(Number)
  const tmr = new Date(Date.UTC(ty, tm - 1, td + 1))
  const tomorrow = `${tmr.getUTCFullYear()}-${String(tmr.getUTCMonth() + 1).padStart(2, '0')}-${String(tmr.getUTCDate()).padStart(2, '0')}`
  let reminders = 0
  // Se envía el día antes, a partir de las 10:00 (para no molestar de madrugada).
  if (hhmm >= '10:00') {
    const { data: tomEvents } = await supabase
      .from('events')
      .select('id, client_id, type, title, completed, reminded_at')
      .eq('event_date', tomorrow)
      .is('reminded_at', null)
      .eq('completed', false)
      .in('type', REMIND_TYPES)
    for (const ev of tomEvents ?? []) {
      try {
        const what = ev.title || TYPE_LABEL[ev.type] || 'una tarea'
        const body = `📋 Recordatorio: mañana toca ${what}. ¡No lo olvides, {nombre}!`
        const ok = await deliver(ev.client_id, body)
        if (ok) {
          await supabase.from('events').update({ reminded_at: new Date().toISOString() }).eq('id', ev.id)
          reminders++
        }
      } catch (e) {
        errors.push(`event ${ev.id}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  // 4) Notas privadas de agenda del entrenador que tocan hoy → email al entrenador.
  let agenda = 0
  if (EMAIL_ENABLED) {
    const { data: rems } = await supabase
      .from('agenda_reminders')
      .select('id, trainer_id, client_id, remind_date, body')
      .lte('remind_date', today)
      .is('notified_at', null)
    for (const r of rems ?? []) {
      try {
        const { data: t } = await supabase.from('profiles').select('email, full_name').eq('id', r.trainer_id).maybeSingle()
        if (!t?.email) continue
        let clientName = ''
        if (r.client_id) {
          const { data: c } = await supabase.from('profiles').select('full_name').eq('id', r.client_id).maybeSingle()
          clientName = c?.full_name ? ` · ${c.full_name}` : ''
        }
        await sendEmail(t.email, `ETHOS · Recordatorio de agenda${clientName}`, `Recordatorio para hoy${clientName}:\n\n${r.body}`)
        await supabase.from('agenda_reminders').update({ notified_at: new Date().toISOString() }).eq('id', r.id)
        agenda++
      } catch (e) {
        errors.push(`agenda ${r.id}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  // 5) Cumpleaños y aniversarios (cada 3 meses). Se envían una vez, por la mañana.
  let greetings = 0
  const monthsBetween = (a: string, b: string): number => {
    const [ay, am, ad] = a.split('-').map(Number)
    const [by, bm, bd] = b.split('-').map(Number)
    let m = (by - ay) * 12 + (bm - am)
    if (bd < ad) m -= 1
    return Math.max(0, m)
  }
  const greet = async (clientId: string, body: string, patch: Record<string, unknown>) => {
    const ok = await deliver(clientId, body)
    if (ok) {
      // También aparece en la campana de notificaciones del cliente.
      await supabase.from('messages').insert({ client_id: clientId, body, send_date: today, notified_at: new Date().toISOString() })
      await supabase.from('profiles').update(patch).eq('id', clientId)
      greetings++
    }
  }
  if (hhmm >= '10:00') {
    const curYear = Number(today.slice(0, 4))
    const todayMD = today.slice(5)
    const dim = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate()
    const todayDay = Number(today.slice(8, 10))
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, birth_date, start_date, last_birthday, last_anniversary, status')
      .eq('role', 'client')
    for (const c of clients ?? []) {
      if ((c.status ?? 'active') !== 'active') continue
      try {
        // Cumpleaños
        if (c.birth_date && c.birth_date.slice(5) === todayMD && c.last_birthday !== curYear) {
          const months = c.start_date ? monthsBetween(c.start_date, today) : 0
          const extra = months >= 1 ? ` Ya llevamos ${months} ${months === 1 ? 'mes' : 'meses'} trabajando juntos.` : ''
          await greet(c.id, `🎂 ¡Feliz cumpleaños, {nombre}!${extra} Gracias por confiar en ETHOS. ¡Que tengas un gran día! 🎉`, { last_birthday: curYear })
        }
        // Aniversario cada 3 meses
        if (c.start_date) {
          const months = monthsBetween(c.start_date, today)
          const startDay = Number(c.start_date.slice(8, 10))
          const dayMatches = todayDay === Math.min(startDay, dim)
          if (months > 0 && months % 3 === 0 && dayMatches && c.last_anniversary !== today) {
            await greet(c.id, `🎉 {nombre}, ¡ya llevamos ${months} meses juntos! Estoy muy contento con tu compromiso y tu trabajo. ¡A por mucho más! 💪`, { last_anniversary: today })
          }
        }
      } catch (e) {
        errors.push(`greet ${c.id}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  return res.status(200).json({ ok: true, date: today, time: hhmm, emails, pushes, reminders, agenda, greetings, errors, channels: { email: EMAIL_ENABLED, push: PUSH_ENABLED } })
}
