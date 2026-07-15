import { supabase } from './supabase'

// Notas privadas del entrenador sobre un cliente. El cliente NO las ve
// (la tabla client_notes solo tiene políticas para el rol entrenador).
export async function getClientNote(clientId: string): Promise<string> {
  const { data, error } = await supabase.from('client_notes').select('body').eq('client_id', clientId).maybeSingle()
  if (error) throw error
  return data?.body ?? ''
}

export async function saveClientNote(clientId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('client_notes')
    .upsert({ client_id: clientId, body: body.trim() || null, updated_at: new Date().toISOString() })
  if (error) throw error
}
