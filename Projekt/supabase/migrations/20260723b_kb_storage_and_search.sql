-- 360AITech: Storage bucket za dokumente baze znanja + RAG iskalna funkcija
-- Idempotentno: skripto je varno večkrat pognati.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "org members can read own documents" on storage.objects;
create policy "org members can read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      public.is_org_member((storage.foldername(name))[1]::uuid)
      or public.is_superadmin()
    )
  );

drop policy if exists "admins and vodje can upload storage objects" on storage.objects;
create policy "admins and vodje can upload storage objects"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      public.is_org_admin((storage.foldername(name))[1]::uuid)
      or public.is_org_vodja((storage.foldername(name))[1]::uuid)
      or public.is_superadmin()
    )
  );

drop policy if exists "admins and vodje can delete storage objects" on storage.objects;
create policy "admins and vodje can delete storage objects"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (
      public.is_org_admin((storage.foldername(name))[1]::uuid)
      or public.is_org_vodja((storage.foldername(name))[1]::uuid)
      or public.is_superadmin()
    )
  );

-- RAG iskalna funkcija: najde najbolj relevantne kose besedila za dano organizacijo/modul
create or replace function public.match_kb_chunks(
  query_embedding vector(1536),
  match_org_id uuid,
  match_module text,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql
security definer
set search_path = public
stable
as $$
  select
    kb_chunks.id,
    kb_chunks.document_id,
    kb_chunks.content,
    1 - (kb_chunks.embedding <=> query_embedding) as similarity
  from public.kb_chunks
  join public.kb_documents on kb_documents.id = kb_chunks.document_id
  where kb_chunks.org_id = match_org_id
    and kb_documents.module = match_module
    and kb_documents.status = 'ready'
    and (public.is_org_member(match_org_id) or public.is_superadmin())
  order by kb_chunks.embedding <=> query_embedding
  limit match_count;
$$;
