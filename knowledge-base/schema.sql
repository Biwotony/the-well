create extension if not exists vector with schema extensions;

create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  author text,
  source_path text,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_format text not null,
  license_status text not null,
  ingestion_policy text not null check (ingestion_policy in ('production_rag', 'historical_rag', 'narrative_only', 'restricted_research', 'blocked_pending_ai_ingestion_license')),
  theological_tier text not null check (theological_tier in ('primary_scripture', 'christian_core', 'christian_secondary', 'historical_non_christian', 'fictional_empathy', 'modern_christian')),
  categories text[] not null default '{}',
  risk_tags text[] not null default '{}',
  retrieval_weight real not null default 0.5 check (retrieval_weight between 0 and 1),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kb_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  section_position integer,
  section_title text,
  content text not null check (length(content) > 0),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  token_estimate integer not null check (token_estimate > 0),
  embedding extensions.vector(384),
  embedding_claimed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  unique (document_id, content_sha256)
);

create index if not exists kb_documents_categories_idx on public.kb_documents using gin (categories);
create index if not exists kb_documents_risk_tags_idx on public.kb_documents using gin (risk_tags);
create index if not exists kb_chunks_document_id_idx on public.kb_chunks (document_id);
create index if not exists kb_chunks_embedding_hnsw_idx on public.kb_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists kb_chunks_embedding_queue_idx on public.kb_chunks (id)
  where embedding is null;

alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;

revoke all on public.kb_documents from anon, authenticated;
revoke all on public.kb_chunks from anon, authenticated;
revoke all on sequence public.kb_chunks_id_seq from anon, authenticated;
grant all on public.kb_documents to service_role;
grant all on public.kb_chunks to service_role;
grant all on sequence public.kb_chunks_id_seq to service_role;

create or replace function public.claim_kb_embedding_chunks(batch_size integer default 2)
returns table (id bigint, content text)
language sql
volatile
security definer
set search_path = ''
as $$
  with pending as (
    select c.id
    from public.kb_chunks c
    join public.kb_documents d on d.id = c.document_id
    where c.embedding is null
      and d.is_active
      and d.ingestion_policy = 'production_rag'
      and (
        c.embedding_claimed_at is null
        or c.embedding_claimed_at < now() - interval '10 minutes'
      )
    order by c.id
    for update skip locked
    limit greatest(1, least(coalesce(batch_size, 2), 5))
  ), claimed as (
    update public.kb_chunks c
    set embedding_claimed_at = now()
    from pending
    where c.id = pending.id
    returning c.id, c.content
  )
  select claimed.id, claimed.content
  from claimed
  order by claimed.id;
$$;

revoke all on function public.claim_kb_embedding_chunks(integer) from public, anon, authenticated;
grant execute on function public.claim_kb_embedding_chunks(integer) to service_role;

create or replace function public.match_kb_chunks(
  query_embedding extensions.vector(384),
  match_count integer default 8,
  minimum_similarity real default 0.45,
  allowed_policies text[] default array['production_rag']::text[],
  allowed_categories text[] default null
)
returns table (
  chunk_id bigint,
  document_external_id text,
  title text,
  author text,
  section_title text,
  content text,
  categories text[],
  risk_tags text[],
  theological_tier text,
  ingestion_policy text,
  similarity real,
  weighted_score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    d.external_id,
    d.title,
    d.author,
    c.section_title,
    c.content,
    d.categories,
    d.risk_tags,
    d.theological_tier,
    d.ingestion_policy,
    (1 - (c.embedding operator(extensions.<=>) query_embedding))::real as similarity,
    ((1 - (c.embedding operator(extensions.<=>) query_embedding)) * d.retrieval_weight)::real as weighted_score
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where d.is_active
    and c.embedding is not null
    and d.ingestion_policy = any(allowed_policies)
    and (allowed_categories is null or d.categories && allowed_categories)
    and (1 - (c.embedding operator(extensions.<=>) query_embedding)) >= minimum_similarity
  order by weighted_score desc
  limit greatest(1, least(coalesce(match_count, 8), 25));
$$;

revoke all on function public.match_kb_chunks(extensions.vector, integer, real, text[], text[]) from public, anon, authenticated;
grant execute on function public.match_kb_chunks(extensions.vector, integer, real, text[], text[]) to service_role;

comment on table public.kb_documents is 'Curated source registry for THE WELL knowledge base.';
comment on table public.kb_chunks is 'Chunked source text. Access is server-only through the service role.';
comment on function public.claim_kb_embedding_chunks is 'Atomically claims a small embedding batch for server-only workers.';
comment on function public.match_kb_chunks is 'Server-only semantic retrieval with policy and category filters.';

