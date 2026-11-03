import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = adminKey()
const ingestionSecret = Deno.env.get('INTERNAL_INGESTION_SECRET')!
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!ingestionSecret || !(await secretsMatch(request.headers.get('x-ingestion-secret') ?? '', ingestionSecret))) {
    return json({ error: 'unauthorized' }, 401)
  }

  const body = await request.json().catch(() => ({}))
  const requestedLimit = Number(body.limit ?? 2)
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.trunc(requestedLimit), 5))
    : 2
  const { data: chunks, error } = await db.rpc('claim_kb_embedding_chunks', {
    batch_size: limit,
  })

  if (error) return json({ error: error.message }, 500)
  let processed = 0
  const failures: Array<{ id: number; error: string }> = []

  for (const chunk of chunks ?? []) {
    try {
      const embedding = await model.run(chunk.content, { mean_pool: true, normalize: true })
      const { error: updateError } = await db
        .from('kb_chunks')
        .update({ embedding, embedding_claimed_at: null })
        .eq('id', chunk.id)
      if (updateError) throw updateError
      processed++
    } catch (cause) {
      await db
        .from('kb_chunks')
        .update({ embedding_claimed_at: null })
        .eq('id', chunk.id)
      failures.push({ id: chunk.id, error: cause instanceof Error ? cause.message : String(cause) })
    }
  }

  return json({ processed, failures }, failures.length ? 207 : 200)
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
  const named = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
  if (typeof named.default === 'string' && named.default) return named.default
  throw new Error('Missing Supabase server secret key')
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

