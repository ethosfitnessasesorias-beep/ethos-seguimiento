// Función de servidor (Vercel) que envía las notificaciones "de hoy" por email.
// Se dispara una vez al día con un cron externo gratuito (cron-job.org) que
// llama a  https://tu-dominio/api/dispatch  con la cabecera del CRON_SECRET.
//
// Variables de entorno necesarias (configúralas en Vercel → Settings → Environment Variables):
//   SUPABASE_URL                 — la URL de tu proyecto (https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY    — clave "service_role" (SECRETA, solo aquí en el servidor)
//   RESEND_API_KEY               — clave de Resend
//   RESEND_FROM                  — remitente, ej: "ETHOS GYM <no-reply@tudominio.com>"
//   CRON_SECRET                  — cadena secreta; Vercel la envía sola al cron
import { createClient } from '@supabase/supabase-js'

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

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
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / (7 * 86400000))
}
function personalize(body: string, name: string | null): string {
  return body.replace(/\{nombre\}/gi, name?.split(' ')[0] || 'crack')
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

// Firmas mínimas para no depender de tipos de Vercel.
interface Req {
  headers: Record<string, string | undefined>
}
interface Res {
  status: (n: number) => Res
  json: (b: unknown) => void
}

export default async function handler(req: Req, res: Res) {
  // Seguridad: solo el cron de Vercel (que envía el CRON_SECRET) puede ejecutarla.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'no autorizado' })
  }

  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  })

  const today = todayISO()
  let sent = 0
  const errors: string[] = []

  const emailFor = async (clientId: string): Promise<{ email: string | null; name: string | null }> => {
    const { data } = await supabase.from('profiles').select('email, full_name').eq('id', clientId).maybeSingle()
    return { email: data?.email ?? null, name: data?.full_name ?? null }
  }

  // 1) Mensajes puntuales vencidos y no enviados.
  const { data: oneOffs } = await supabase
    .from('messages')
    .select('id, client_id, body')
    .lte('send_date', today)
    .is('notified_at', null)
  for (const m of oneOffs ?? []) {
    try {
      const { email, name } = await emailFor(m.client_id)
      if (email) {
        await sendEmail(email, 'ETHOS GYM · Mensaje de tu entrenador', personalize(m.body, name))
        sent++
      }
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
      // ¿coincide con el intervalo de semanas desde la primera ocurrencia?
      const firstOcc = s.start_date // asumimos start_date ya en el weekday elegido o anterior
      const w = weeksBetween(firstOcc, today)
      if (w < 0 || w % Math.max(1, s.interval_weeks) !== 0) continue
      // ¿ya enviado hoy?
      const { data: already } = await supabase
        .from('schedule_sends')
        .select('id')
        .eq('schedule_id', s.id)
        .eq('send_date', today)
        .maybeSingle()
      if (already) continue
      const { email, name } = await emailFor(s.client_id)
      if (email) {
        await sendEmail(email, 'ETHOS GYM · Mensaje de tu entrenador', personalize(s.body, name))
        sent++
      }
      await supabase.from('schedule_sends').insert({ schedule_id: s.id, send_date: today })
    } catch (e) {
      errors.push(`sched ${s.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  return res.status(200).json({ ok: true, date: today, sent, errors, weekdayName: DAY_NAMES[weekdayOf(today)] })
}
