-- ═══════════════════════════════════════════════════════════
-- CipherCrown Client Portal — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- ═══════════════════════════════════════════════════════════

-- ─── profiles ───
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  practice_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, practice_name, email)
  values (new.id, new.raw_user_meta_data ->> 'practice_name', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── projects ───
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'In Progress',
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: select own" on public.projects
  for select using (auth.uid() = client_id);

-- ─── reports ───
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  summary text,
  metric_label text,
  metric_value text,
  report_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports: select own" on public.reports
  for select using (auth.uid() = client_id);

-- ─── deliverables ───
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.deliverables enable row level security;

create policy "deliverables: select own" on public.deliverables
  for select using (auth.uid() = client_id);

-- ─── messages ───
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('client', 'agency')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages: select own" on public.messages
  for select using (auth.uid() = client_id);

create policy "messages: insert own as client" on public.messages
  for insert with check (auth.uid() = client_id and sender = 'client');

-- Enable Realtime for messages so agency replies appear live in the dashboard.
alter publication supabase_realtime add table public.messages;

-- ─── storage: deliverables bucket ───
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- Clients can only read files inside a folder named after their own uid,
-- e.g. deliverables/<client_id>/proposal.pdf
create policy "deliverables bucket: read own folder" on storage.objects
  for select using (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
