-- 360AITech: temeljna shema (organizacije, profili, članstva, vloge, povabila)
-- Idempotentno: skripto je varno večkrat pognati.

create extension if not exists pgcrypto;

-- ORGANIZATIONS -------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- PROFILES (1:1 z auth.users) -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- MEMBERSHIPS (uporabnik <-> organizacija, z vlogo in dostopom do modulov) ---
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  allowed_modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

-- ORG_INVITES (povabila po emailu za pridružitev obstoječi organizaciji) -----
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'user')),
  allowed_modules text[] not null default '{}',
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token)
);

-- HELPER FUNKCIJE (security definer, da se izognemo RLS rekurziji) ----------
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = check_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = check_org_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- TRIGGER: ob registraciji novega auth.users zapisa ustvari profiles vrstico -
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: samostojna registracija -> nova organizacija + klicatelj postane admin
create or replace function public.create_organization_with_admin(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name) values (org_name)
  returning id into new_org_id;

  insert into public.memberships (user_id, org_id, role)
  values (auth.uid(), new_org_id, 'admin');

  return new_org_id;
end;
$$;

-- RPC: sprejem povabila -> preveri token in ustvari članstvo z vlogo iz povabila
create or replace function public.accept_org_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
  caller_email text;
  result_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into invite from public.org_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if invite is null then
    raise exception 'Invalid or expired invite';
  end if;

  select email into caller_email from auth.users where id = auth.uid();

  if caller_email is null or lower(caller_email) <> lower(invite.email) then
    raise exception 'Invite email does not match logged in user';
  end if;

  insert into public.memberships (user_id, org_id, role, allowed_modules)
  values (auth.uid(), invite.org_id, invite.role, invite.allowed_modules)
  on conflict (user_id, org_id) do nothing;

  update public.org_invites set accepted_at = now() where id = invite.id;

  result_org_id := invite.org_id;
  return result_org_id;
end;
$$;

-- ROW LEVEL SECURITY ----------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.org_invites enable row level security;

-- organizations: viden je samo članom te organizacije
drop policy if exists "org members can view organization" on public.organizations;
create policy "org members can view organization"
  on public.organizations for select
  using (public.is_org_member(id));

-- Opomba: neposreden insert v organizations ni dovoljen iz odjemalca;
-- ustvarjanje gre izključno preko funkcije create_organization_with_admin().

drop policy if exists "org admins can update organization" on public.organizations;
create policy "org admins can update organization"
  on public.organizations for update
  using (public.is_org_admin(id));

-- profiles: vsak vidi/ureja samo svoj profil
drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- memberships: član vidi članstva znotraj svoje organizacije, admin ureja
drop policy if exists "org members can view memberships" on public.memberships;
create policy "org members can view memberships"
  on public.memberships for select
  using (public.is_org_member(org_id));

-- Opomba: neposreden insert v memberships ni dovoljen iz odjemalca;
-- ustvarjanje gre izključno preko funkcij create_organization_with_admin() / accept_org_invite().

drop policy if exists "org admins can manage memberships" on public.memberships;
create policy "org admins can manage memberships"
  on public.memberships for update
  using (public.is_org_admin(org_id));

drop policy if exists "org admins can remove memberships" on public.memberships;
create policy "org admins can remove memberships"
  on public.memberships for delete
  using (public.is_org_admin(org_id));

-- org_invites: samo admini svoje organizacije vidijo/ustvarjajo povabila
drop policy if exists "org admins can view invites" on public.org_invites;
create policy "org admins can view invites"
  on public.org_invites for select
  using (public.is_org_admin(org_id));

drop policy if exists "org admins can create invites" on public.org_invites;
create policy "org admins can create invites"
  on public.org_invites for insert
  with check (public.is_org_admin(org_id) and invited_by = auth.uid());

drop policy if exists "org admins can delete invites" on public.org_invites;
create policy "org admins can delete invites"
  on public.org_invites for delete
  using (public.is_org_admin(org_id));
