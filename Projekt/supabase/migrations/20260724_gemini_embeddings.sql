-- 360AITech: preklop embeddingov iz OpenAI (1536-dim) na Google Gemini
-- text-embedding-004 (768-dim). Varno, ker do zdaj ni bilo uspešnih vnosov
-- (OPENAI_API_KEY nikoli ni bil nastavljen).

drop function if exists public.match_kb_chunks(vector, uuid, text, int);

alter table public.kb_chunks
  alter column embedding type vector(768);

drop index if exists public.kb_chunks_embedding_idx;
create index kb_chunks_embedding_idx on public.kb_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_kb_chunks(
  query_embedding vector(768),
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
