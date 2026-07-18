import { supabase } from './supabase'

export type ChecklistKind = 'nuevo' | 'plani'

export async function getChecklist(clientId: string, kind: ChecklistKind): Promise<string[]> {
  const { data, error } = await supabase
    .from('client_checklists')
    .select('done')
    .eq('client_id', clientId)
    .eq('kind', kind)
    .maybeSingle()
  if (error) throw error
  return (data?.done as string[]) ?? []
}

export async function setChecklist(clientId: string, kind: ChecklistKind, done: string[]): Promise<void> {
  const { error } = await supabase
    .from('client_checklists')
    .upsert({ client_id: clientId, kind, done, updated_at: new Date().toISOString() }, { onConflict: 'client_id,kind' })
  if (error) throw error
}
