import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const embeddingModel = 'gte-small'
const maxRequestBytes = 1_000

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = adminKey()
  const ingestionSecret = Deno.env.get('INTERNAL_INGESTION_SECRET')
  if (!supabaseUrl || !serviceRoleKey || !ingestionSecret) return json({ error: 'server_configuration_missing' }, 500)
  if (!ingestionSecret || !(await secretsMatch(request.headers.get('x-ingestion-secret') ?? '', ingestionSecret))) {
    return json({ error: 'unauthorized' }, 401)
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maxRequestBytes) return json({ error: 'request_too_large' }, 413)
  const body = rawBody ? await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => null) : {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_json' }, 400)
  const requestedLimit = Number(body.limit ?? 2)
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.trunc(requestedLimit), 5))
    : 2
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const model = new Supabase.ai.Session(embeddingModel)
  const { data: chunks, error } = await db.rpc('claim_kb_embedding_chunks', {
    batch_size: limit,
  })

  if (error) return json({ error: error.message }, 500)
  let processed = 0
  const failures: Array<{ id: number; error: string }> = []

  for (const chunk of chunks ?? []) {
    try {
      const embedding = await model.run(chunk.content, { mean_pool: true, normalize: true }) as number[]
      if (!Array.isArray(embedding) || embedding.length !== 384 || embedding.some((value) => !Number.isFinite(value))) {
        throw new Error('embedding_dimension_mismatch')
      }
      const { data: completed, error: updateError } = await db.rpc('complete_kb_embedding_chunk', {
        p_id: chunk.id,
        p_claim_token: chunk.claim_token,
        p_embedding: embedding,
        p_model: embeddingModel,
      })
      if (updateError || completed !== true) throw new Error('stale_or_failed_embedding_claim')
      processed++
    } catch (cause) {
      const code = safeErrorCode(cause)
      await db.rpc('fail_kb_embedding_chunk', {
        p_id: chunk.id,
        p_claim_token: chunk.claim_token,
        p_error_code: code,
      })
      failures.push({ id: chunk.id, error: code })
    }
  }

  console.info('kb_embedding_batch_complete', { claimed: chunks?.length ?? 0, processed, failed: failures.length })
  return json({ claimed: chunks?.length ?? 0, processed, failures }, failures.length ? 207 : 200)
})

function json(value: unknown, status: number) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function adminKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const single = Deno.env.get('SUPABASE_SECRET_KEY')
  if (single) return single
  try {
    const named = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    if (typeof named.default === 'string' && named.default) return named.default
  } catch {
    return ''
  }
  return ''
}

function safeErrorCode(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause)
  const allowed = ['embedding_dimension_mismatch', 'stale_or_failed_embedding_claim']
  return allowed.includes(message) ? message : 'embedding_generation_failed'
}

async function secretsMatch(candidate: string, expected: string) {
  const encoder = new TextEncoder()
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  const left = new Uint8Array(candidateHash)
  const right = new Uint8Array(expectedHash)
  let difference = left.length ^ right.length
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}

