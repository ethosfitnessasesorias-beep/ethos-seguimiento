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

-- ============================================================
--  Fotos de progreso (Fase: Fotos)
-- ============================================================

-- Tabla con la fecha y la ruta de cada foto en el almacenamiento.
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.progress_photos enable row level security;

drop policy if exists "client writes own photos rows" on public.progress_photos;
create policy "client writes own photos rows" on public.progress_photos
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "trainer reads photos rows" on public.progress_photos;
create policy "trainer reads photos rows" on public.progress_photos
  for select using (public.my_role() = 'trainer');

-- Bucket de almacenamiento (privado; las imágenes se sirven con enlaces firmados).
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Políticas del almacenamiento: cada cliente gestiona su carpeta; el entrenador lee.
drop policy if exists "client manages own photo files" on storage.objects;
create policy "client manages own photo files" on storage.objects
  for all to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "trainer reads photo files" on storage.objects;
create policy "trainer reads photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and public.my_role() = 'trainer');

-- ============================================================
--  Formularios (Fase: Formularios)
-- ============================================================
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  form_type text not null,
  form_title text not null,
  answers jsonb not null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.form_submissions enable row level security;

drop policy if exists "client writes own forms" on public.form_submissions;
create policy "client writes own forms" on public.form_submissions
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "trainer reads forms" on public.form_submissions;
create policy "trainer reads forms" on public.form_submissions
  for select using (public.my_role() = 'trainer');

drop policy if exists "trainer updates forms" on public.form_submissions;
create policy "trainer updates forms" on public.form_submissions
  for update using (public.my_role() = 'trainer') with check (public.my_role() = 'trainer');
