import { supabase } from './supabase'
import { todayStr } from './events'

export interface UnreviewedForm {
  id: string
  client_id: string
  form_title: string
  created_at: string
}

export async function getUnreviewedForms(clientIds: string[]): Promise<UnreviewedForm[]> {
  if (clientIds.length === 0) return []
  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, client_id, form_title, created_at')
    .eq('reviewed', false)
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as UnreviewedForm[]
}

export interface UpcomingEvent {
  id: string
  client_id: string
  event_date: string
  type: string
  title: string | null
  time: string | null
}

export async function getUpcomingEvents(clientIds: string[]): Promise<UpcomingEvent[]> {
  if (clientIds.length === 0) return []
  const { data, error } = await supabase
    .from('events')
    .select('id, client_id, event_date, type, title, time')
    .in('client_id', clientIds)
    .gte('event_date', todayStr())
    .order('event_date', { ascending: true })
    .limit(12)
  if (error) throw error
  return (data ?? []) as UpcomingEvent[]
}

// ---- Resumen de equipo (por entrenador) ----
export interface TeamRow {
  trainer_id: string
  trainer_name: string | null
  clients: number
  avg_adherence: number
  avg_months: number
}

export async function getTeamSummary(): Promise<TeamRow[]> {
  const { data, error } = await supabase.rpc('get_team_summary')
  if (error) throw error
  return (data ?? []) as TeamRow[]
}
