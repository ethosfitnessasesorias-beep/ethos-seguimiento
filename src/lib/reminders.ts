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
