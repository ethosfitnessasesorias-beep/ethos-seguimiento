import { supabase } from './supabase'

// Historial de contacto con el cliente: llamadas, mensajes, revisiones,
// incidencias… Solo lo ve el entrenador (el cliente no tiene acceso).
export type LogKind = 'nota' | 'llamada' | 'whatsapp' | 'revision' | 'incidencia'

export const LOG_KINDS: { key: LogKind; label: string; icon: string; color: string }[] = [
  { key: 'nota', label: 'Nota', icon: '📝', color: '#a78bfa' },
  { key: 'llamada', label: 'Llamada', icon: '📞', color: '#818cf8' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { key: 'revision', label: 'Revisión', icon: '🏋️', color: '#f87171' },
  { key: 'incidencia', label: 'Incidencia', icon: '⚠️', color: '#f5a623' },
]

export function logKind(k: string) {
  return LOG_KINDS.find((x) => x.key === k) ?? LOG_KINDS[0]
}

export interface ClientLog {
  id: string
  client_id: string
  trainer_id: string | null
  log_date: string
  kind: LogKind
  body: string
  archived: boolean
  created_at: string
}

/**
 * Anotaciones de un cliente. Por defecto solo las ACTIVAS; con
 * `archived: true` devuelve las que se han archivado (no se borran nunca,
 * solo salen de la vista normal para que el historial no ocupe tanto).
 */
export async function listLogs(clientId: string, archived = false): Promise<ClientLog[]> {
  const { data, error } = await supabase
    .from('client_logs')
    .select('*')
    .eq('client_id', clientId)
    .eq('archived', archived)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ClientLog[]
}

/** Archiva (o recupera) una anotación. No borra nada. */
export async function setLogArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('client_logs')
    .update({ archived, archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

/**
 * Archiva de golpe todas las anotaciones activas con fecha anterior a
 * `beforeISO`. Devuelve cuántas ha archivado.
 */
export async function archiveLogsBefore(clientId: string, beforeISO: string): Promise<number> {
  const { data, error } = await supabase
    .from('client_logs')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('archived', false)
    .lt('log_date', beforeISO)
    .select('id')
  if (error) throw error
  return (data ?? []).length
}

/** Fecha ISO de hace N meses (para el archivado masivo). */
export function monthsAgoISO(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function addLog(clientId: string, kind: LogKind, body: string, logDate?: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('client_logs').insert({
    client_id: clientId,
    trainer_id: u.user?.id ?? null,
    kind,
    body: body.trim(),
    ...(logDate ? { log_date: logDate } : {}),
  })
  if (error) throw error
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('client_logs').delete().eq('id', id)
  if (error) throw error
}

/** Fecha del último contacto de cada cliente (para avisar de los "olvidados"). */
export async function lastContactDates(clientIds: string[]): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map()
  const { data } = await supabase
    .from('client_logs')
    .select('client_id, log_date')
    .in('client_id', clientIds)
    .order('log_date', { ascending: false })
  const m = new Map<string, string>()
  for (const r of data ?? []) {
    const id = r.client_id as string
    if (!m.has(id)) m.set(id, r.log_date as string)
  }
  return m
}
