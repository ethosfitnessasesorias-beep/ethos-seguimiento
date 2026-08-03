import { supabase } from './supabase'

// Ofertas Grand Slam lanzadas (o por lanzar) a un cliente. Solo las gestiona
// el entrenador: la tabla no tiene política de lectura para clientes.
export interface ClientOffer {
  id: string
  client_id: string
  title: string
  notes: string | null
  launched: boolean
  launched_at: string | null
  created_at: string
}

export async function listOffers(clientId: string): Promise<ClientOffer[]> {
  const { data, error } = await supabase
    .from('client_offers')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ClientOffer[]
}

export async function addOffer(clientId: string, title: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from('client_offers')
    .insert({ client_id: clientId, title: title.trim(), notes: notes?.trim() || null })
  if (error) throw error
}

export async function setOfferLaunched(id: string, launched: boolean): Promise<void> {
  const { error } = await supabase
    .from('client_offers')
    .update({ launched, launched_at: launched ? new Date().toISOString().slice(0, 10) : null })
    .eq('id', id)
  if (error) throw error
}

export async function setOfferNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase.from('client_offers').update({ notes: notes.trim() || null }).eq('id', id)
  if (error) throw error
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from('client_offers').delete().eq('id', id)
  if (error) throw error
}
