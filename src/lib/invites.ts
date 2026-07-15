import { supabase } from './supabase'

export interface Invite {
  id: string
  trainer_id: string
  email: string | null
  full_name: string | null
  created_at: string
  used_at: string | null
  used_by: string | null
}

export interface InvitePublic {
  full_name: string | null
  email: string | null
  used: boolean
}

// ---- Entrenador ----
export async function listInvites(): Promise<Invite[]> {
  const { data, error } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Invite[]
}

export async function createInvite(fullName: string | null, email: string | null): Promise<Invite> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('invites')
    .insert({ trainer_id: userData.user?.id, full_name: fullName, email })
    .select()
    .single()
  if (error) throw error
  return data as Invite
}

export async function deleteInvite(id: string) {
  const { error } = await supabase.from('invites').delete().eq('id', id)
  if (error) throw error
}

// ---- Crear un nuevo ENTRENADOR (solo entrenadores) ----
// La cuenta se crea en el servidor con la clave de administrador; aquí solo
// enviamos la sesión del entrenador que lo pide.
export async function createTrainer(email: string, password: string, fullName: string | null, phone: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sesión no encontrada. Vuelve a iniciar sesión.')
  const res = await fetch('/api/create-trainer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, password, full_name: fullName, phone }),
  })
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !out.ok) throw new Error(out.error || 'No se pudo crear el entrenador.')
}

export function inviteLink(id: string): string {
  return `${window.location.origin}/?invite=${id}`
}

export function inviteMailto(invite: Invite): string {
  const link = inviteLink(invite.id)
  const name = invite.full_name?.split(' ')[0] || ''
  const subject = 'Tu acceso a ETHOS GYM · Seguimiento'
  const body =
    `Hola${name ? ' ' + name : ''}:\n\n` +
    `Te doy acceso a la app de seguimiento de ETHOS GYM. Entra en este enlace, crea tu contraseña y rellena tus datos:\n\n` +
    `${link}\n\n` +
    `Después podrás instalarla en tu móvil como una app.\n\n¡Nos vemos dentro!`
  return `mailto:${invite.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---- Registro por invitación (sin sesión) ----
export async function getInvite(token: string): Promise<InvitePublic | null> {
  const { data, error } = await supabase.rpc('get_invite', { p_token: token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { full_name: row.full_name ?? null, email: row.email ?? null, used: !!row.used }
}

export interface RedeemFields {
  full_name: string
  email: string
  phone: string | null
  city: string | null
  age: number | null
  sex: string | null
  height_cm: number | null
  injuries: string | null
  pathologies: string | null
  main_goal: string | null
}

export async function redeemInvite(token: string, f: RedeemFields) {
  const { error } = await supabase.rpc('redeem_invite', {
    p_token: token,
    p_full_name: f.full_name,
    p_email: f.email,
    p_phone: f.phone,
    p_city: f.city,
    p_age: f.age,
    p_sex: f.sex,
    p_height: f.height_cm,
    p_injuries: f.injuries,
    p_pathologies: f.pathologies,
    p_main_goal: f.main_goal,
  })
  if (error) throw error
}
