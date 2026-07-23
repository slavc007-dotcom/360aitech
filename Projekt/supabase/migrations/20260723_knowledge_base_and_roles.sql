-- 360AITech: vloga "vodja", superadmin (platformski nivo) in shema baze znanja (RAG)
-- Idempotentno: skripto je varno večkrat pognati.

create extension if not exists vector;

-- VLOGA "vodja" ----------------------------------------------------------------
alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check check (role in ('admin', 'vodja', 'user'));

alter table public.org_invites drop constraint if exists org_invites_role_check;
alter table public.org_invites
  add constraint org_invites_role_check check (role in ('admin', 'vodja', 'user'));

-- SUPERADMIN (platformski nivo, čez vse organizacije) --------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

drop policy if exists "superadmins can view platform_admins" on public.platform_admins;
create policy "superadmins can view platform_admins"
  on public.platform_admins for select
  using (public.is_superadmin());

-- Prvi superadmin: obstoječi račun uporabnika (če že obstaja)
insert into public.platform_admins (user_id)
select id from auth.users where email = 'slavc007@gmail.com'
on conflict (user_id) do nothing;

-- HELPER: is_org_vodja ----------------------------------------------------------
create or replace function public.is_org_vodja(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = check_org_id and user_id = auth.uid() and role = 'vodja'
  );
$$;

-- Superadmin vidi vse organizacije/članstva ------------------------------------
drop policy if exists "org members can view organization" on public.organizations;
create policy "org members can view organization"
  on public.organizations for select
  using (public.is_org_member(id) or public.is_superadmin());

drop policy if exists "org members can view memberships" on public.memberships;
create policy "org members can view memberships"
  on public.memberships for select
  using (public.is_org_member(org_id) or public.is_superadmin());

-- org_invites: dovoli tudi vodji ustvarjanje povabil (omejeno na role='user' -
-- na aplikacijski ravni v createInvite(); RLS dovoli insert, ne diktira vloge) --
drop policy if exists "org admins can create invites" on public.org_invites;
create policy "org admins can create invites"
  on public.org_invites for insert
  with check (
    invited_by = auth.uid()
    and (
      public.is_org_admin(org_id)
      or (public.is_org_vodja(org_id) and role = 'user')
    )
  );

drop policy if exists "org admins can view invites" on public.org_invites;
create policy "org admins can view invites"
  on public.org_invites for select
  using (public.is_org_admin(org_id) or public.is_org_vodja(org_id));

-- KNOWLEDGE BASE: kb_documents ---------------------------------------------------
create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  module text not null check (module in ('chat', 'email', 'onboarding', 'support', 'legal', 'documents')),
  title text not null,
  storage_provider text not null check (storage_provider in ('supabase', 'google_drive', 'local_agent')),
  storage_path text not null,
  mime_type text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists kb_documents_org_module_idx on public.kb_documents (org_id, module);

-- KNOWLEDGE BASE: kb_chunks (vektorski indeks za RAG iskanje) --------------------
create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  content text not null,
  embedding vector(1536),
  chunk_index int not null,
  created_at timestamptz not null default now()
);

create index if not exists kb_chunks_org_idx on public.kb_chunks (org_id);
create index if not exists kb_chunks_embedding_idx on public.kb_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- AGENT TOKENS (za lokalni sync agent, Faza 4) ------------------------------------
create table if not exists public.agent_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  created_by uuid not null references auth.users (id),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: kb_documents / kb_chunks / agent_tokens ------------------------------------
alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.agent_tokens enable row level security;

drop policy if exists "org members can view documents" on public.kb_documents;
create policy "org members can view documents"
  on public.kb_documents for select
  using (public.is_org_member(org_id) or public.is_superadmin());

drop policy if exists "admins and vodje can upload documents" on public.kb_documents;
create policy "admins and vodje can upload documents"
  on public.kb_documents for insert
  with check (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  );

drop policy if exists "admins and vodje can update documents" on public.kb_documents;
create policy "admins and vodje can update documents"
  on public.kb_documents for update
  using (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  );

drop policy if exists "admins and vodje can delete documents" on public.kb_documents;
create policy "admins and vodje can delete documents"
  on public.kb_documents for delete
  using (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  );

drop policy if exists "org members can view chunks" on public.kb_chunks;
create policy "org members can view chunks"
  on public.kb_chunks for select
  using (public.is_org_member(org_id) or public.is_superadmin());

drop policy if exists "admins and vodje can manage chunks" on public.kb_chunks;
create policy "admins and vodje can manage chunks"
  on public.kb_chunks for all
  using (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  )
  with check (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  );

drop policy if exists "admins and vodje can manage agent tokens" on public.agent_tokens;
create policy "admins and vodje can manage agent tokens"
  on public.agent_tokens for all
  using (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  )
  with check (
    public.is_org_admin(org_id) or public.is_org_vodja(org_id) or public.is_superadmin()
  );
