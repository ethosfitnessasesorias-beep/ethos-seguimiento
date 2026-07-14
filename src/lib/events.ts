import { supabase } from './supabase'

// ---- Tipos de evento ----
export type EventType = 'entreno' | 'cardio' | 'reporte' | 'cambio'

export interface EventTypeConfig {
  label: string
  color: string
  /** Si el evento enlaza a un formulario, su tipo. */
  form: 'reporte' | 'cambio' | null
}

export const EVENT_TYPES: Record<EventType, EventTypeConfig> = {
  entreno: { label: 'Entrenamiento', color: '#db1809', form: null },
  cardio: { label: 'Objetivo cardio', color: '#f5a623', form: null },
  reporte: { label: 'Rellenar reporte', color: '#2dd4bf', form: 'reporte' },
  cambio: { label: 'Cambio de planificación', color: '#a78bfa', form: 'cambio' },
}

export const EVENT_ORDER: EventType[] = ['entreno', 'cardio', 'reporte', 'cambio']

export interface CalEvent {
  id: string
  client_id: string
  event_date: string // YYYY-MM-DD
  type: EventType
  time: string | null
  detail: string | null
  title: string | null
  program_id: string | null
  program_name: string | null
  completed: boolean
  note: string | null
  created_at: string
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Marca un evento como hecho / no hecho y recalcula la adherencia. */
export async function setEventCompleted(eventId: string, clientId: string, completed: boolean) {
  const { error } = await supabase.from('events').update({ completed }).eq('id', eventId)
  if (error) throw error
  await recomputeAdherence(clientId)
}

export async function setEventNote(eventId: string, note: string) {
  const { error } = await supabase.from('events').update({ note: note || null }).eq('id', eventId)
  if (error) throw error
}

/** Adherencia = eventos completados / eventos ya vencidos (hasta hoy) × 100. */
export async function recomputeAdherence(clientId: string): Promise<number> {
  const today = todayStr()
  const { data } = await supabase
    .from('events')
    .select('completed, event_date')
    .eq('client_id', clientId)
    .lte('event_date', today)
  const due = data ?? []
  const pct = due.length === 0 ? 0 : Math.round((due.filter((e) => e.completed).length / due.length) * 100)
  await supabase.from('profiles').update({ adherence: pct }).eq('id', clientId)
  return pct
}

// ---- Utilidades de fecha (seguras, sin dependencias) ----
export function isoAddDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ---- CRUD de eventos ----
export async function listEvents(clientId: string, fromISO: string, toISO: string): Promise<CalEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('client_id', clientId)
    .gte('event_date', fromISO)
    .lte('event_date', toISO)
    .order('event_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as CalEvent[]
}

export async function addEvent(clientId: string, e: { event_date: string; type: EventType; time?: string; detail?: string }) {
  const { error } = await supabase.from('events').insert({
    client_id: clientId,
    event_date: e.event_date,
    type: e.type,
    time: e.time || null,
    detail: e.detail || null,
  })
  if (error) throw error
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

// ---- Programas semanales ----
// pattern: para cada día (0=Lunes … 6=Domingo) una lista de eventos.
export type WeekPattern = Record<number, { type: EventType; title?: string; time?: string }[]>

export interface ProgramTemplate {
  id: string
  trainer_id: string
  name: string
  pattern: WeekPattern
  created_at: string
}

interface ProgramRow {
  client_id: string
  event_date: string
  type: EventType
  time: string | null
  title: string | null
  program_id: string
  program_name: string
}

/** Genera eventos concretos aplicando un patrón semanal desde una fecha, N semanas. */
export async function generateProgram(
  clientId: string,
  pattern: WeekPattern,
  startMondayISO: string,
  weeks: number,
  programName: string,
) {
  const programId = crypto.randomUUID()
  const rows: ProgramRow[] = []
  for (let w = 0; w < weeks; w++) {
    for (let day = 0; day <= 6; day++) {
      const entries = pattern[day] || []
      if (entries.length === 0) continue
      const date = isoAddDays(startMondayISO, w * 7 + day)
      for (const e of entries) {
        rows.push({
          client_id: clientId,
          event_date: date,
          type: e.type,
          time: e.time || null,
          title: e.title || null,
          program_id: programId,
          program_name: programName,
        })
      }
    }
  }
  if (rows.length === 0) return 0
  const { error } = await supabase.from('events').insert(rows)
  if (error) throw error
  return rows.length
}

/** Elimina todos los eventos de un programa. */
export async function deleteProgram(programId: string) {
  const { error } = await supabase.from('events').delete().eq('program_id', programId)
  if (error) throw error
}

export async function listTemplates(): Promise<ProgramTemplate[]> {
  const { data, error } = await supabase.from('program_templates').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProgramTemplate[]
}

export async function saveTemplate(name: string, pattern: WeekPattern) {
  const { data: userData } = await supabase.auth.getUser()
  const trainerId = userData.user?.id
  const { error } = await supabase.from('program_templates').insert({ trainer_id: trainerId, name, pattern })
  if (error) throw error
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('program_templates').delete().eq('id', id)
  if (error) throw error
}
