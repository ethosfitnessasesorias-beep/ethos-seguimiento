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
  sex: string | null // 'male' | 'female'
  height_cm: number | null
  current_weight: number | null
  target_weight: number | null
  injuries: string | null
  pathologies: string | null
  main_goal: string | null
  adherence: number | null
  messages_read_until: string | null
  trainer_id: string | null
  contract_signed_at: string | null
  contract_signature_name: string | null
  contract_dni: string | null
  contract_version: string | null
  status: string | null // 'active' | 'inactive'
  deactivated_at: string | null
  start_date: string | null // fecha real de alta (para los regalos)
  created_at: string
}

export type ClientStatus = 'active' | 'inactive'

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
// Solo los clientes asignados al entrenador que ha iniciado sesión.
// Por defecto, solo los ACTIVOS (los dashboards no cuentan a los inactivos).
export async function listClients(status: ClientStatus | 'all' = 'active'): Promise<Profile[]> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  let q = supabase.from('profiles').select('*').eq('role', 'client')
  if (uid) q = q.eq('trainer_id', uid)
  const { data, error } = await q.order('full_name', { ascending: true })
  if (error) throw error
  const rows = data ?? []
  if (status === 'all') return rows
  return rows.filter((c) => (c.status ?? 'active') === status)
}

// Nombre y WhatsApp del entrenador del cliente actual (para el botón de chat).
export async function getMyTrainer(): Promise<{ full_name: string | null; phone: string | null } | null> {
  const { data, error } = await supabase.rpc('get_my_trainer')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row ? { full_name: row.full_name ?? null, phone: row.phone ?? null } : null
}

// Construye un enlace de WhatsApp a partir de un teléfono (España por defecto).
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null
  // Si son 9 dígitos (móvil español sin prefijo), anteponemos 34.
  if (digits.length === 9) digits = '34' + digits
  const base = `https://wa.me/${digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

// Da de baja / reactiva a un cliente sin borrar sus datos.
export async function setClientStatus(clientId: string, status: ClientStatus): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, deactivated_at: status === 'inactive' ? new Date().toISOString() : null })
    .eq('id', clientId)
  if (error) throw error
}

// Elimina DEFINITIVAMENTE al cliente y todos sus datos (irreversible).
export async function deleteClientPermanently(clientId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sesión no encontrada. Vuelve a iniciar sesión.')
  const res = await fetch('/api/delete-client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ client_id: clientId }),
  })
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !out.ok) throw new Error(out.error || 'No se pudo eliminar el cliente.')
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

// Borra un registro de peso y recalcula el "peso actual" del perfil.
export async function deleteWeight(id: string, clientId: string) {
  const { error } = await supabase.from('weight_logs').delete().eq('id', id)
  if (error) throw error
  const { data } = await supabase
    .from('weight_logs')
    .select('weight')
    .eq('client_id', clientId)
    .order('log_date', { ascending: true })
  const rows = data ?? []
  const latest = rows.length ? Number(rows[rows.length - 1].weight) : null
  await supabase.from('profiles').update({ current_weight: latest }).eq('id', clientId)
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
  logDate?: string,
) {
  const { error } = await supabase
    .from('perimeter_logs')
    .insert({ client_id: clientId, ...(logDate ? { log_date: logDate } : {}), ...values })
  if (error) throw error
}

export async function deletePerimeter(id: string) {
  const { error } = await supabase.from('perimeter_logs').delete().eq('id', id)
  if (error) throw error
}

// ---- Fotos de progreso ----
export const PHOTO_BUCKET = 'progress-photos'

export interface ProgressPhoto {
  id: string
  client_id: string
  log_date: string
  storage_path: string
  folder_id: string | null
  created_at: string
}

export interface PhotoWithUrl extends ProgressPhoto {
  url: string | null
}

export interface PhotoFolder {
  id: string
  client_id: string
  name: string
  created_at: string
}

export async function listPhotoFolders(clientId: string): Promise<PhotoFolder[]> {
  const { data, error } = await supabase
    .from('photo_folders')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as PhotoFolder[]
}

export async function createPhotoFolder(clientId: string, name: string): Promise<void> {
  const { error } = await supabase.from('photo_folders').insert({ client_id: clientId, name: name.trim() })
  if (error) throw error
}

export async function deletePhotoFolder(id: string): Promise<void> {
  const { error } = await supabase.from('photo_folders').delete().eq('id', id)
  if (error) throw error
}

export async function movePhoto(photoId: string, folderId: string | null): Promise<void> {
  const { error } = await supabase.from('progress_photos').update({ folder_id: folderId }).eq('id', photoId)
  if (error) throw error
}

export async function listPhotos(clientId: string): Promise<PhotoWithUrl[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as ProgressPhoto[]
  if (rows.length === 0) return []
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600)
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? null }))
}

export async function addPhoto(clientId: string, file: File, folderId?: string | null): Promise<void> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (upErr) throw upErr
  const { error } = await supabase
    .from('progress_photos')
    .insert({ client_id: clientId, storage_path: path, folder_id: folderId ?? null })
  if (error) throw error
}

export async function deletePhoto(photo: ProgressPhoto): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path])
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id)
  if (error) throw error
}
