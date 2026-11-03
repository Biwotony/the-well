import { createReadStream, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, resolve } from 'node:path'
import { pipeline } from '@huggingface/transformers'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '')
const serverKey = process.env.SUPABASE_SECRET_KEY ?? required('SUPABASE_SERVICE_ROLE_KEY')
const requestedBatchSize = Number(process.env.EMBEDDING_BATCH_SIZE ?? 32)
const batchSize = Number.isFinite(requestedBatchSize)
  ? Math.max(1, Math.min(Math.trunc(requestedBatchSize), 64))
  : 32

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function request(path, init = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serverKey,
      Authorization: `Bearer ${serverKey}`,
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} failed (${response.status}): ${await response.text()}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
const eligible = manifest.filter(
  (doc) =>
    doc.production_eligible &&
    doc.license_status === 'public_domain_us' &&
    doc.ingestion_policy === 'production_rag',
)
const allowedExternalIds = new Set(eligible.map((doc) => doc.external_id))
if (!allowedExternalIds.size) throw new Error('No production-RAG documents are eligible for embedding.')

const idsFilter = encodeURIComponent(`(${[...allowedExternalIds].join(',')})`)
const documents = await request(
  `/rest/v1/kb_documents?select=id,external_id&external_id=in.${idsFilter}`,
)
const documentIds = new Map(documents.map((doc) => [doc.external_id, doc.id]))
if (documentIds.size !== allowedExternalIds.size) {
  throw new Error('Production document registry does not match the verified manifest.')
}

const embed = await pipeline('feature-extraction', 'Supabase/gte-small', { dtype: 'q8' })
const lines = createInterface({
  input: createReadStream(join(dist, 'corpus', 'chunks.jsonl'), { encoding: 'utf8' }),
  crlfDelay: Infinity,
})

let batch = []
let embedded = 0

async function flush() {
  if (!batch.length) return
  const output = await embed(
    batch.map((chunk) => chunk.content),
    { pooling: 'mean', normalize: true },
  )
  if (output.dims.length !== 2 || output.dims[0] !== batch.length || output.dims[1] !== 384) {
    throw new Error(`Unexpected embedding dimensions: ${JSON.stringify(output.dims)}`)
  }

  const rows = batch.map((chunk, index) => ({
    document_id: documentIds.get(chunk.document_external_id),
    chunk_index: chunk.chunk_index,
    section_position: chunk.section_position,
    section_title: chunk.section_title,
    content: chunk.content,
    content_sha256: chunk.content_sha256,
    token_estimate: chunk.token_estimate,
    embedding: Array.from(output.data.slice(index * 384, (index + 1) * 384)),
    embedding_claimed_at: null,
    metadata: {
      categories: chunk.categories,
      theological_tier: chunk.theological_tier,
      ingestion_policy: chunk.ingestion_policy,
      risk_tags: chunk.risk_tags,
      retrieval_weight: chunk.retrieval_weight,
    },
  }))

  await request('/rest/v1/kb_chunks?on_conflict=document_id,chunk_index', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  embedded += rows.length
  process.stdout.write(`embedded ${embedded} production chunks\n`)
  batch = []
}

for await (const line of lines) {
  if (!line.trim()) continue
  const chunk = JSON.parse(line)
  if (!allowedExternalIds.has(chunk.document_external_id)) continue
  batch.push(chunk)
  if (batch.length >= batchSize) await flush()
}
await flush()

const expected = eligible.reduce((sum, doc) => sum + Number(doc.chunk_count ?? 0), 0)
if (embedded !== expected) {
  throw new Error(`Embedded ${embedded} chunks, expected ${expected} from the verified manifest.`)
}
process.stdout.write(`THE WELL local embedding backfill completed (${embedded} chunks).\n`)
