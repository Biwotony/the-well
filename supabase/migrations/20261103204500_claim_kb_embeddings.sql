alter table public.kb_chunks
  add column if not exists embedding_claimed_at timestamptz;

create index if not exists kb_chunks_embedding_queue_idx on public.kb_chunks (id)
  where embedding is null;

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

comment on function public.claim_kb_embedding_chunks is
  'Atomically claims a small embedding batch for server-only workers.';
