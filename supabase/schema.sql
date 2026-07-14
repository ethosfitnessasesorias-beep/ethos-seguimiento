-- ============================================================
--  ETHOS Seguimiento · Esquema de base de datos (Supabase)
--  Pega TODO esto en Supabase → SQL Editor → New query → Run.
--  Es seguro ejecutarlo más de una vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Perfiles (una fila por usuario) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('trainer','client')),
  full_name text,
  email text,
  -- datos de cliente (los rellenará el entrenador en una fase posterior)
  plan text,
  phone text,
  city text,
  age int,
  height_cm numeric,
  current_weight numeric,
  target_weight numeric,
  injuries text,
  pathologies text,
  main_goal text,
  created_at timestamptz not null default now()
);

-- ---------- Registros de peso ----------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  weight numeric not null,
  created_at timestamptz not null default now()
);

-- ---------- Registros de perímetros ----------
create table if not exists public.perimeter_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  cintura numeric,
  cadera numeric,
  pecho numeric,
  brazo numeric,
  pierna numeric,
  cuello numeric,
  created_at timestamptz not null default now()
);

-- ---------- Función auxiliar: rol del usuario actual ----------
-- (security definer para evitar recursión de RLS al leer profiles)
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- Activar Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
alter table public.perimeter_logs enable row level security;

-- ---------- Políticas: profiles ----------
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "trainer reads clients" on public.profiles;
create policy "trainer reads clients" on public.profiles
  for select using (public.my_role() = 'trainer' and role = 'client');

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- El entrenador puede editar la ficha de sus clientes (Fase 2).
drop policy if exists "trainer updates clients" on public.profiles;
create policy "trainer updates clients" on public.profiles
  for update using (public.my_role() = 'trainer' and role = 'client')
  with check (public.my_role() = 'trainer' and role = 'client');

-- ---------- Políticas: weight_logs ----------
drop policy if exists "client writes own weights" on public.weight_logs;
create policy "client writes own weights" on public.weight_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "trainer reads weights" on public.weight_logs;
create policy "trainer reads weights" on public.weight_logs
  for select using (public.my_role() = 'trainer');

-- ---------- Políticas: perimeter_logs ----------
drop policy if exists "client writes own perimeters" on public.perimeter_logs;
create policy "client writes own perimeters" on public.perimeter_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "trainer reads perimeters" on public.perimeter_logs;
create policy "trainer reads perimeters" on public.perimeter_logs
  for select using (public.my_role() = 'trainer');
