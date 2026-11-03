param(
  [string]$DistDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist')
)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $DistDir 'manifest.json'
$chunksPath = Join-Path $DistDir 'corpus\chunks.jsonl'
$qaPath = Join-Path $DistDir 'reports\qa-report.json'

foreach ($required in @($manifestPath, $chunksPath, $qaPath)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing required output: $required" }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$qa = Get-Content -LiteralPath $qaPath -Raw | ConvertFrom-Json
$chunkCount = 0
$chunkKeys = [System.Collections.Generic.HashSet[string]]::new()
$documentIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($doc in $manifest) { [void]$documentIds.Add([string]$doc.external_id) }

Get-Content -LiteralPath $chunksPath | ForEach-Object {
  if (-not $_) { return }
  $chunk = $_ | ConvertFrom-Json
  if (-not $documentIds.Contains([string]$chunk.document_external_id)) { throw "Chunk references unknown document: $($chunk.document_external_id)" }
  if ([string]::IsNullOrWhiteSpace([string]$chunk.content)) { throw "Empty chunk found" }
  if ([int]$chunk.token_estimate -gt 512) { throw "Chunk exceeds gte-small's 512-token limit: $($chunk.document_external_id):$($chunk.chunk_index)" }
  $key = "$($chunk.document_external_id):$($chunk.chunk_index)"
  if (-not $chunkKeys.Add($key)) { throw "Duplicate chunk key: $key" }
  $chunkCount++
}

if ($chunkCount -ne [int]$qa.total_chunks) { throw "Chunk count mismatch: read $chunkCount, report says $($qa.total_chunks)" }
if (@($manifest | Where-Object { $_.license_status -ne 'public_domain_us' -and $_.chunk_count -gt 0 }).Count -gt 0) { throw "Copyrighted/reference-only source was chunked" }
if (@($manifest | Where-Object { $_.ingestion_policy -eq 'blocked_pending_ai_ingestion_license' -and $_.production_eligible }).Count -gt 0) { throw "Blocked source marked production eligible" }
if (@($manifest | Where-Object { $_.ingestion_policy -eq 'restricted_research' -and $_.production_eligible }).Count -gt 0) { throw "Restricted research source marked production eligible" }

Write-Output "Verified $($manifest.Count) documents and $chunkCount unique chunks."

