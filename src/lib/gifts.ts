import { supabase } from './supabase'

export type Milestone = 'welcome' | '6m' | '12m'

export const MILESTONES: { key: Milestone; label: string; months: number }[] = [
  { key: 'welcome', label: 'Regalo de bienvenida', months: 0 },
  { key: '6m', label: 'Regalo · 6 meses', months: 6 },
  { key: '12m', label: 'Regalo · 12 meses', months: 12 },
]

export interface GiftClaim {
  id: string
  client_id: string
  milestone: Milestone
  claimed_at: string
  delivered: boolean
  delivered_at: string | null
}

function addMonths(iso: string, months: number): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setMonth(dt.getMonth() + months)
  return dt
}
function daysUntil(target: Date): number {
  const now = new Date()
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((b - a) / 86400000)
}

export type GiftStatus = 'locked' | 'available' | 'claimed' | 'delivered'

export interface GiftStep {
  key: Milestone
  label: string
  date: Date
  daysRemaining: number
  status: GiftStatus
}

/** Construye el cronograma de regalos a partir de la fecha de alta y lo reclamado. */
export function giftTimeline(startISO: string, claims: GiftClaim[]): GiftStep[] {
  return MILESTONES.map((m) => {
    const date = addMonths(startISO, m.months)
    const days = daysUntil(date)
    const claim = claims.find((c) => c.milestone === m.key)
    let status: GiftStatus
    if (claim) status = claim.delivered ? 'delivered' : 'claimed'
    else if (days <= 0) status = 'available'
    else status = 'locked'
    return { key: m.key, label: m.label, date, daysRemaining: days, status }
  })
}

/** El próximo hito no entregado (para el titular "faltan X días"). */
export function nextGift(steps: GiftStep[]): GiftStep | null {
  return steps.find((s) => s.status === 'locked') ?? steps.find((s) => s.status === 'available') ?? null
}

// ---- Cliente ----
export async function listClaims(clientId: string): Promise<GiftClaim[]> {
  const { data, error } = await supabase.from('gift_claims').select('*').eq('client_id', clientId)
  if (error) throw error
  return (data ?? []) as GiftClaim[]
}

export async function claimGift(clientId: string, milestone: Milestone) {
  const { error } = await supabase.from('gift_claims').insert({ client_id: clientId, milestone })
  if (error) throw error
}

// ---- Entrenador ----
export interface PendingClaim extends GiftClaim {
  client_name: string | null
}

export async function listPendingClaims(): Promise<PendingClaim[]> {
  const { data, error } = await supabase
    .from('gift_claims')
    .select('*, profiles!gift_claims_client_id_fkey(full_name)')
    .eq('delivered', false)
    .order('claimed_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    client_id: r.client_id as string,
    milestone: r.milestone as Milestone,
    claimed_at: r.claimed_at as string,
    delivered: r.delivered as boolean,
    delivered_at: r.delivered_at as string | null,
    client_name: ((r.profiles as { full_name?: string } | null)?.full_name) ?? null,
  }))
}

export async function markGiftDelivered(id: string) {
  const { error } = await supabase
    .from('gift_claims')
    .update({ delivered: true, delivered_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export function milestoneLabel(m: Milestone): string {
  return MILESTONES.find((x) => x.key === m)?.label ?? m
}

// El entrenador marca un regalo como ya entregado (útil para clientes antiguos
// que ya recibieron su regalo de bienvenida fuera de la app).
export async function setMilestoneDelivered(clientId: string, milestone: Milestone) {
  const { error } = await supabase
    .from('gift_claims')
    .upsert(
      { client_id: clientId, milestone, delivered: true, delivered_at: new Date().toISOString() },
      { onConflict: 'client_id,milestone' },
    )
  if (error) throw error
}

// Deshace la marca (vuelve a dejar el regalo pendiente).
export async function removeMilestoneClaim(clientId: string, milestone: Milestone) {
  const { error } = await supabase.from('gift_claims').delete().eq('client_id', clientId).eq('milestone', milestone)
  if (error) throw error
}
