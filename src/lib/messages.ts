import { supabase } from './supabase'
import { isoAddDays, todayStr, weekdayOfISO } from './events'
import type { Profile } from './db'

export const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// ---- Mensajes puntuales ----
export interface Message {
  id: string
  client_id: string
  trainer_id: string | null
  body: string
  send_date: string
  read: boolean
  created_at: string
}

// ---- Mensajes recurrentes (programaciones) ----
export interface MessageSchedule {
  id: string
  client_id: string
  body: string
  weekday: number // 0=Lunes … 6=Domingo
  interval_weeks: number // 1 = cada semana, 2 = cada 2 semanas…
  start_date: string
  end_date: string | null // null = no termina nunca
  created_at: string
}

/** Sustituye {nombre} por el nombre del cliente. */
export function personalize(body: string, name: string | null): string {
  return body.replace(/\{nombre\}/gi, name?.split(' ')[0] || 'crack')
}

export const MESSAGE_TEMPLATES = [
  '¡Vamos {nombre}! Otra semana para acercarte a tu objetivo 💪',
  'Recuerda rellenar tu reporte, {nombre}. ¡Tu constancia marca la diferencia!',
  '{nombre}, no olvides tus pasos de hoy. Pequeños hábitos, grandes resultados.',
  '¡Buen trabajo esta semana, {nombre}! Sigue así 🔥',
]

/** Descripción legible de una programación. */
export function describeSchedule(s: MessageSchedule): string {
  const freq = s.interval_weeks > 1 ? `cada ${s.interval_weeks} semanas` : 'cada semana'
  const end = s.end_date ? `hasta ${s.end_date}` : 'sin fecha fin'
  return `Cada ${DAY_NAMES[s.weekday]} · ${freq} · ${end}`
}

/** Fechas en las que una programación se muestra, hasta `until` inclusive. */
export function scheduleOccurrences(s: MessageSchedule, until: string, max = 120): string[] {
  const wd = weekdayOfISO(s.start_date)
  let d = isoAddDays(s.start_date, (s.weekday - wd + 7) % 7)
  const out: string[] = []
  while (d <= until && out.length < max) {
    if (s.end_date && d > s.end_date) break
    out.push(d)
    d = isoAddDays(d, 7 * Math.max(1, s.interval_weeks))
  }
  return out
}

// ---- CRUD ----
export async function listOneOffMessages(clientId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('send_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function createMessage(clientId: string, body: string, sendDate: string) {
  const { error } = await supabase.from('messages').insert({ client_id: clientId, body, send_date: sendDate })
  if (error) throw error
}

export async function deleteMessage(id: string) {
  await supabase.from('messages').delete().eq('id', id)
}

export async function listSchedules(clientId: string): Promise<MessageSchedule[]> {
  const { data, error } = await supabase
    .from('message_schedules')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MessageSchedule[]
}

export async function createSchedule(
  clientId: string,
  body: string,
  weekday: number,
  intervalWeeks: number,
  endDate: string | null,
) {
  const { error } = await supabase.from('message_schedules').insert({
    client_id: clientId,
    body,
    weekday,
    interval_weeks: Math.max(1, intervalWeeks),
    end_date: endDate,
  })
  if (error) throw error
}

export async function deleteSchedule(id: string) {
  await supabase.from('message_schedules').delete().eq('id', id)
}

// ---- Notificaciones del cliente (puntuales + recurrencias generadas) ----
export interface NotificationItem {
  id: string
  body: string
  date: string
  read: boolean
}

export async function listNotifications(profile: Profile): Promise<NotificationItem[]> {
  const today = todayStr()
  const [msgs, schedules] = await Promise.all([listOneOffMessages(profile.id), listSchedules(profile.id)])
  const readUntil = profile.messages_read_until ?? ''
  const items: NotificationItem[] = msgs
    .filter((m) => m.send_date <= today)
    .map((m) => ({ id: m.id, body: m.body, date: m.send_date, read: m.read }))
  for (const s of schedules) {
    for (const d of scheduleOccurrences(s, today)) {
      items.push({ id: `${s.id}·${d}`, body: s.body, date: d, read: readUntil !== '' && d <= readUntil })
    }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : -1))
  return items
}

export async function markAllNotificationsRead(clientId: string) {
  await supabase.from('messages').update({ read: true }).eq('client_id', clientId).eq('read', false)
  await supabase.from('profiles').update({ messages_read_until: todayStr() }).eq('id', clientId)
}
