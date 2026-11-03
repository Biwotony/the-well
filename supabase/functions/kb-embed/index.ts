import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ingestionSecret = Deno.env.get('INTERNAL_INGESTION_SECRET')!
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!ingestionSecret || request.headers.get('x-ingestion-secret') !== ingestionSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const body = await request.json().catch(() => ({}))
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 50))
  const { data: chunks, error } = await db
    .from('kb_chunks')
    .select('id,content')
    .is('embedding', null)
    .order('id', { ascending: true })
    .limit(limit)

  if (error) return json({ error: error.message }, 500)
  let processed = 0
  const failures: Array<{ id: number; error: string }> = []

  for (const chunk of chunks ?? []) {
    try {
      const embedding = await model.run(chunk.content, { mean_pool: true, normalize: true })
      const { error: updateError } = await db
        .from('kb_chunks')
        .update({ embedding })
        .eq('id', chunk.id)
      if (updateError) throw updateError
      processed++
    } catch (cause) {
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

