import { supabase } from './supabase'

// ---- Tipos de la base de datos ----
export type Role = 'trainer' | 'client'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  email: string | null
  plan: string | null
  phone: string | null
  city: string | null
  age: number | null
  height_cm: number | null
  current_weight: number | null
  target_weight: number | null
  injuries: string | null
  pathologies: string | null
  main_goal: string | null
  created_at: string
}

export interface WeightLog {
  id: string
  client_id: string
  log_date: string
  weight: number
  created_at: string
}

export interface PerimeterLog {
  id: string
  client_id: string
  log_date: string
  cintura: number | null
  cadera: number | null
  pecho: number | null
  brazo: number | null
  pierna: number | null
  cuello: number | null
  created_at: string
}

export const PERIMETER_FIELDS = [
  { key: 'cintura', label: 'Cintura' },
  { key: 'cadera', label: 'Cadera' },
  { key: 'pecho', label: 'Pecho' },
  { key: 'brazo', label: 'Brazo' },
  { key: 'pierna', label: 'Pierna' },
  { key: 'cuello', label: 'Cuello' },
] as const

// ---- Perfil ----
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile(p: Partial<Profile> & { id: string; role: Role }) {
  const { error } = await supabase.from('profiles').upsert(p)
  if (error) throw error
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) throw error
}

// ---- Clientes (vista entrenador) ----
export async function listClients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ---- Peso ----
export async function listWeights(clientId: string): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addWeight(clientId: string, weight: number, logDate?: string) {
  const { error } = await supabase.from('weight_logs').insert({
    client_id: clientId,
    weight,
    ...(logDate ? { log_date: logDate } : {}),
  })
  if (error) throw error
  // Mantiene el "peso actual" del perfil sincronizado con el último registro.
  await supabase.from('profiles').update({ current_weight: weight }).eq('id', clientId)
}

// ---- Perímetros ----
export async function listPerimeters(clientId: string): Promise<PerimeterLog[]> {
  const { data, error } = await supabase
    .from('perimeter_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addPerimeters(
  clientId: string,
  values: Partial<Record<(typeof PERIMETER_FIELDS)[number]['key'], number>>,
) {
  const { error } = await supabase.from('perimeter_logs').insert({ client_id: clientId, ...values })
  if (error) throw error
}
