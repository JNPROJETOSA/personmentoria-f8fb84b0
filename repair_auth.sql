
-- 1. Ensure tables exist (Idempotent)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  name text,
  full_name text, -- keeping both for compatibility if needed, or mapping one
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  last_study_date text, -- Storing as ISO text YYYY-MM-DD
  frozen boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns if they missed (for existing tables)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='name') then
        alter table public.profiles add column name text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='xp') then
        alter table public.profiles add column xp integer default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='level') then
        alter table public.profiles add column level integer default 1;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='streak') then
        alter table public.profiles add column streak integer default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='last_study_date') then
        alter table public.profiles add column last_study_date text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='frozen') then
        alter table public.profiles add column frozen boolean default false;
    end if;
    -- Fix user_id vs id confusion: useAdminData expects user_id property but supabase returns row. 
    -- If the code expects 'user_id' in the returned object, we can add a computed column or view, 
    -- BUT it's easier to just add the column user_id as a copy of id if strictly needed, 
    -- OR better: verify if useAdminData maps it from 'id'.
    -- Looking at useAdminData.ts: "user_id: profile.user_id". 
    -- We should add user_id column to be safe and populate it.
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
        alter table public.profiles add column user_id uuid;
    end if;
end $$;

-- Update user_id to match id
update public.profiles set user_id = id where user_id is null;

create table if not exists public.admin_whitelist (
  email text primary key,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- 2. Backfill Profiles for existing users
insert into public.profiles (id, user_id, email, role, name, full_name, xp, level, streak)
select 
  id,
  id, -- user_id
  email, 
  'student',
  raw_user_meta_data->>'full_name', -- name
  raw_user_meta_data->>'full_name', -- full_name
  0, 1, 0 -- defaults
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- 3. Promote Admins
insert into public.admin_whitelist (email, role) values ('famulape@gmail.com', 'admin') on conflict (email) do update set role = 'admin';
insert into public.admin_whitelist (email, role) values ('jotajoao29@gmail.com', 'admin') on conflict (email) do update set role = 'admin';

update public.profiles set role = 'admin' where email in ('famulape@gmail.com', 'jotajoao29@gmail.com');

-- 4. Fix RLS Policies (Drop and Recreate to be sure)
alter table public.profiles enable row level security;
alter table public.admin_whitelist enable row level security;

-- PROFILES
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles for select using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using ( auth.uid() = id );

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using ( auth.uid() = id );

-- WHITELIST
drop policy if exists "Admins can manage whitelist" on public.admin_whitelist;
create policy "Admins can manage whitelist" on public.admin_whitelist for all using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- 5. Helper View for debugging (Optional, but helps see what's happening)
create or replace view public.debug_users as select * from public.profiles;
