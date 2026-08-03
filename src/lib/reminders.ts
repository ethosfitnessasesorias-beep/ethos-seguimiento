import { supabase } from './supabase'

// Notas privadas de agenda del entrenador (recordatorios con aviso por email).
// El cliente no las ve.
export interface AgendaReminder {
  id: string
  trainer_id: string
  client_id: string | null
  remind_date: string
  body: string
  notified_at: string | null
  created_at: string
}

export async function listReminders(clientId: string): Promise<AgendaReminder[]> {
  const { data, error } = await supabase
    .from('agenda_reminders')
    .select('*')
    .eq('client_id', clientId)
    .order('remind_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as AgendaReminder[]
}

export async function addReminder(clientId: string, remindDate: string, body: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('agenda_reminders').insert({
    trainer_id: u.user?.id,
    client_id: clientId,
    remind_date: remindDate,
    body: body.trim(),
  })
  if (error) throw error
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('agenda_reminders').delete().eq('id', id)
  if (error) throw error
}

// Próximos avisos del entrenador (todos sus clientes), para el Resumen.
export interface UpcomingReminder {
  id: string
  client_id: string | null
  client_name: string | null
  remind_date: string
  body: string
}

export async function listUpcomingReminders(limit = 12): Promise<UpcomingReminder[]> {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('agenda_reminders')
    .select('id, client_id, remind_date, body, profiles!agenda_reminders_client_id_fkey(full_name)')
    .gte('remind_date', today)
    .order('remind_date', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    client_id: (r.client_id as string | null) ?? null,
    client_name: ((r.profiles as { full_name?: string } | null)?.full_name) ?? null,
    remind_date: r.remind_date as string,
    body: r.body as string,
  }))
}
