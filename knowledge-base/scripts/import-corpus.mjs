import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? required('SUPABASE_SERVICE_ROLE_KEY')
const ingestionSecret = process.env.INTERNAL_INGESTION_SECRET ?? ''
const runEmbeddings = process.env.RUN_EMBEDDINGS === '1'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function request(path, init = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${init.method ?? 'GET'} ${path} failed (${response.status}): ${body}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function ensureBucket() {
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'kb-sources',
      name: 'kb-sources',
      public: false,
      file_size_limit: 25 * 1024 * 1024,
      allowed_mime_types: ['application/epub+zip'],
    }),
  })
  if (response.ok || response.status === 409) return
  throw new Error(`Bucket creation failed (${response.status}): ${await response.text()}`)
}

async function uploadSources(manifest) {
  const allowedSources = manifest
    .filter((doc) => doc.production_eligible && doc.license_status === 'public_domain_us')
    .map((doc) => doc.deployed_source)
    .filter((path) => typeof path === 'string' && path.startsWith('sources/public-domain/'))
    .sort()

  for (const relativePath of allowedSources) {
    const name = basename(relativePath)
    const bytes = readFileSync(join(dist, relativePath))
    await request(`/storage/v1/object/kb-sources/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/epub+zip',
        'x-upsert': 'true',
      },
      body: bytes,
    })
    process.stdout.write(`uploaded ${name}\n`)
  }
}

async function upsertDocuments(manifest) {
  const eligible = manifest.filter((doc) => doc.production_eligible)
  const payload = eligible.map((doc) => ({
    external_id: doc.external_id,
    title: doc.title,
    author: doc.author,
    source_path: doc.deployed_source,
    source_sha256: doc.source_sha256,
    source_format: doc.source_format,
    license_status: doc.license_status,
    ingestion_policy: doc.ingestion_policy,
    theological_tier: doc.theological_tier,
    categories: doc.categories,
    risk_tags: doc.risk_tags,
    retrieval_weight: doc.retrieval_weight,
    metadata: {
      chunk_count: doc.chunk_count,
      extracted_characters: doc.extracted_characters,
    },
  }))
  const rows = await request('/rest/v1/kb_documents?on_conflict=external_id&select=id,external_id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })
  return new Map(rows.map((row) => [row.external_id, row.id]))
}

async function importChunks(documentIds) {
  const input = createReadStream(join(dist, 'corpus', 'chunks.jsonl'), { encoding: 'utf8' })
  const lines = createInterface({ input, crlfDelay: Infinity })
  let batch = []
  let imported = 0

  async function flush() {
    if (!batch.length) return
    await request('/rest/v1/kb_chunks?on_conflict=document_id,chunk_index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    imported += batch.length
    process.stdout.write(`imported ${imported} chunks\n`)
    batch = []
  }

  for await (const line of lines) {
    if (!line.trim()) continue
    const chunk = JSON.parse(line)
    const documentId = documentIds.get(chunk.document_external_id)
    if (!documentId) continue
    batch.push({
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      section_position: chunk.section_position,
      section_title: chunk.section_title,
      content: chunk.content,
      content_sha256: chunk.content_sha256,
      token_estimate: chunk.token_estimate,
      metadata: {
        categories: chunk.categories,
        theological_tier: chunk.theological_tier,
        ingestion_policy: chunk.ingestion_policy,
        risk_tags: chunk.risk_tags,
        retrieval_weight: chunk.retrieval_weight,
      },
    })
    if (batch.length >= 100) await flush()
  }
  await flush()
}

async function generateEmbeddings() {
  if (!runEmbeddings) return
  if (!ingestionSecret) throw new Error('RUN_EMBEDDINGS=1 requires INTERNAL_INGESTION_SECRET')
  for (;;) {
    const result = await request('/functions/v1/kb-embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingestion-secret': ingestionSecret,
      },
      body: JSON.stringify({ limit: 20 }),
    })
    process.stdout.write(`embedded ${result.processed} chunks\n`)
    if (result.processed === 0) break
  }
}

for (const path of ['manifest.json', join('corpus', 'chunks.jsonl'), join('reports', 'qa-report.json')]) {
  if (!existsSync(join(dist, path))) throw new Error(`Missing dist/${path}; build and verify the corpus first.`)
}

await ensureBucket()
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
const qa = JSON.parse(readFileSync(join(dist, 'reports', 'qa-report.json'), 'utf8'))
if (qa.total_chunks <= 0 || qa.manifest_entries !== manifest.length) {
  throw new Error('Corpus QA report does not match the manifest; rebuild and verify before importing.')
}
if (manifest.some((doc) => doc.production_eligible && doc.license_status !== 'public_domain_us')) {
  throw new Error('Non-public-domain source is marked production eligible.')
}

await uploadSources(manifest)
const documentIds = await upsertDocuments(manifest)
await importChunks(documentIds)
await generateEmbeddings()
process.stdout.write('THE WELL corpus import completed.\n')

