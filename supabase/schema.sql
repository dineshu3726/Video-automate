-- ============================================================
-- VideoForge – Supabase Schema
-- Run this in your Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  yt_token    text,
  ig_token    text,
  created_at  timestamptz default now() not null
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── video_jobs ─────────────────────────────────────────────────
create type video_status as enum (
  'pending',
  'scripting',
  'generating',
  'processing',
  'review',
  'approved',
  'rejected',
  'published'
);

create table if not exists public.video_jobs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  status        video_status not null default 'pending',
  script        text,
  video_url     text,
  thumbnail_url text,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- Auto-update the updated_at timestamp
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_video_jobs_updated_at on public.video_jobs;
create trigger set_video_jobs_updated_at
  before update on public.video_jobs
  for each row execute procedure public.set_updated_at();

-- ── settings ───────────────────────────────────────────────────
create table if not exists public.settings (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  post_interval  int  not null default 24,   -- hours between auto-posts
  preferred_time time not null default '09:00:00'
);

-- ── Row Level Security ─────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.video_jobs enable row level security;
alter table public.settings   enable row level security;

-- profiles: users can only see and edit their own row
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- video_jobs: users can only access their own jobs
create policy "video_jobs: own rows" on public.video_jobs
  for all using (auth.uid() = user_id);

-- settings: users can only access their own settings
create policy "settings: own row" on public.settings
  for all using (auth.uid() = user_id);

-- ── Realtime (required for DashboardClient live updates) ──────
-- In Supabase Dashboard → Database → Replication
-- Enable "video_jobs" table for realtime broadcasts.
-- Or run:
-- alter publication supabase_realtime add table public.video_jobs;

-- ── Storage bucket for videos (Phase 3) ───────────────────────
-- REQUIRED: Run this block in Supabase SQL Editor to enable video storage.

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Users can upload only to their own folder ({user_id}/{job_id}.mp4)
create policy "videos: authenticated upload to own folder"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated'
    and bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only read their own files
create policy "videos: read own files"
  on storage.objects for select
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role can manage all files (used by admin client in API routes)
create policy "videos: service role full access"
  on storage.objects for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
