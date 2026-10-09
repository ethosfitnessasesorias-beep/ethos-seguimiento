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
  created_at: string
}

export async function listLogs(clientId: string): Promise<ClientLog[]> {
  const { data, error } = await supabase
    .from('client_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ClientLog[]
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
