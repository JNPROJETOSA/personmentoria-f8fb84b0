-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Tables

-- PROFILES: Stores user roles and details
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ADMIN_WHITELIST: Stores emails allowed to sign up
create table if not exists public.admin_whitelist (
  email text primary key,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- 2. Row Level Security (RLS)

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.admin_whitelist enable row level security;

-- PROFILES Policies (Drop first to ensure updates apply)
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );
  
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- WHITELIST Policies
drop policy if exists "Admins can manage whitelist" on public.admin_whitelist;
create policy "Admins can manage whitelist"
  on public.admin_whitelist
  for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );
  
-- 3. Triggers and Functions

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_whitelisted boolean;
  user_role text;
begin
  -- Check if email is in whitelist
  select true, role into is_whitelisted, user_role
  from public.admin_whitelist
  where email = new.email;

  if is_whitelisted is true then
    -- Create profile if it doesn't match
    insert into public.profiles (id, email, role, full_name)
    values (new.id, new.email, user_role, new.raw_user_meta_data->>'full_name')
    on conflict (id) do nothing;
    return new;
  else
    -- Block signup if not whitelisted
    raise exception 'Email not authorized by administrator.';
  end if;
return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users (Drop first to avoid duplication error)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Initial Bootstrap (SEED DATA)
-- Using ON CONFLICT TO DO NOTHING prevents errors if already inserted
insert into public.admin_whitelist (email, role) values ('famulape@gmail.com', 'admin') on conflict (email) do nothing;
insert into public.admin_whitelist (email, role) values ('jotajoao29@gmail.com', 'admin') on conflict (email) do nothing;
