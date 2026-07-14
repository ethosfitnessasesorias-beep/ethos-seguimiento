import { supabase } from './supabase'
import { isoAddDays } from './events'

export interface Message {
  id: string
  client_id: string
  trainer_id: string | null
  body: string
  send_date: string
  read: boolean
  created_at: string
}

/** Sustituye {nombre} por el nombre del cliente. */
export function personalize(body: string, name: string | null): string {
  return body.replace(/\{nombre\}/gi, name?.split(' ')[0] || 'crack')
}

// Plantillas rápidas de motivación.
export const MESSAGE_TEMPLATES = [
  '¡Vamos {nombre}! Otra semana para acercarte a tu objetivo 💪',
  'Recuerda rellenar tu reporte, {nombre}. ¡Tu constancia marca la diferencia!',
  '{nombre}, no olvides tus pasos de hoy. Pequeños hábitos, grandes resultados.',
  '¡Buen trabajo esta semana, {nombre}! Sigue así 🔥',
]

// ---- Cliente ----
export async function listClientMessages(clientId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('send_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function markMessageRead(id: string) {
  await supabase.from('messages').update({ read: true }).eq('id', id)
}

export async function markAllRead(clientId: string) {
  await supabase.from('messages').update({ read: true }).eq('client_id', clientId).eq('read', false)
}

// ---- Entrenador ----
export async function listTrainerMessages(clientId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('send_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Message[]
}

/** Crea uno o varios mensajes (repetición semanal opcional). */
export async function createMessages(clientId: string, body: string, startDate: string, repeatWeeks: number) {
  const rows = []
  for (let i = 0; i < Math.max(1, repeatWeeks); i++) {
    rows.push({ client_id: clientId, body, send_date: isoAddDays(startDate, i * 7) })
  }
  const { error } = await supabase.from('messages').insert(rows)
  if (error) throw error
  return rows.length
}

export async function deleteMessage(id: string) {
  await supabase.from('messages').delete().eq('id', id)
}
