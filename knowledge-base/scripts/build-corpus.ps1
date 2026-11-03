param(
  [Parameter(Mandatory = $false)]
  [string]$SourceDir = 'C:\Users\User\Downloads\WELL',
  [Parameter(Mandatory = $false)]
  [string]$OutputDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'),
  [int]$MaxChunkChars = 4200,
  [int]$OverlapChars = 450
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Web

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$CatalogPath = Join-Path $ProjectRoot 'config\catalog.json'
$Catalog = Get-Content -LiteralPath $CatalogPath -Raw | ConvertFrom-Json

$SourcesOut = Join-Path $OutputDir 'sources\public-domain'
$CorpusOut = Join-Path $OutputDir 'corpus'
$ReportsOut = Join-Path $OutputDir 'reports'
New-Item -ItemType Directory -Force -Path $SourcesOut, $CorpusOut, $ReportsOut | Out-Null

$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$ChunksPath = Join-Path $CorpusOut 'chunks.jsonl'
$Writer = [System.IO.StreamWriter]::new($ChunksPath, $false, $Utf8NoBom)
$Manifest = [System.Collections.Generic.List[object]]::new()
$Errors = [System.Collections.Generic.List[string]]::new()
$SeenHashes = @{}
$TotalChunks = 0

function Read-ZipEntryText {
  param($Entry)
  $reader = [System.IO.StreamReader]::new($Entry.Open(), [System.Text.Encoding]::UTF8, $true)
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Convert-HtmlToText {
  param([string]$Html)
  if ([string]::IsNullOrWhiteSpace($Html)) { return '' }
  $value = [regex]::Replace($Html, '(?is)<(script|style|svg|nav)[^>]*>.*?</\1>', ' ')
  $value = [regex]::Replace($value, '(?is)<header[^>]*id=["'']pg-header["''][^>]*>.*?</header>', ' ')
  $value = [regex]::Replace($value, '(?is)<(br\s*/?|/p|/div|/li|/h[1-6]|/blockquote|/tr)>', "`n`n")
  $value = [regex]::Replace($value, '(?is)<[^>]+>', ' ')
  $value = [System.Web.HttpUtility]::HtmlDecode($value)
  $value = $value -replace "\u00A0", ' '
  $value = $value -replace '[\t ]+', ' '
  $value = $value -replace ' *\r?\n *', "`n"
  $value = $value -replace '(\r?\n){3,}', "`n`n"
  $value = $value.Trim()
  $start = $value.IndexOf('*** START OF THE PROJECT GUTENBERG EBOOK', [System.StringComparison]::OrdinalIgnoreCase)
  if ($start -ge 0) {
    $lineEnd = $value.IndexOf("`n", $start)
    if ($lineEnd -ge 0) { $value = $value.Substring($lineEnd + 1).Trim() }
  }
  $end = $value.IndexOf('*** END OF THE PROJECT GUTENBERG EBOOK', [System.StringComparison]::OrdinalIgnoreCase)
  if ($end -ge 0) { $value = $value.Substring(0, $end).Trim() }
  return $value
}

function Get-FirstHeading {
  param([string]$Html, [string]$Fallback)
  $match = [regex]::Match($Html, '(?is)<h[1-3][^>]*>(.*?)</h[1-3]>')
  if (-not $match.Success) { return $Fallback }
  $heading = Convert-HtmlToText $match.Groups[1].Value
  if ([string]::IsNullOrWhiteSpace($heading)) { return $Fallback }
  return $heading
}

function Get-EpubSections {
  param([string]$Path)
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $opfEntry = $zip.Entries | Where-Object { $_.FullName -match '\.opf$' } | Select-Object -First 1
    if (-not $opfEntry) { throw "No OPF package found in $Path" }
    [xml]$opf = Read-ZipEntryText $opfEntry
    $opfDir = [System.IO.Path]::GetDirectoryName($opfEntry.FullName).Replace('\', '/')
    $items = @{}
    foreach ($item in $opf.SelectNodes('//*[local-name()="manifest"]/*[local-name()="item"]')) {
      $items[$item.id] = [string]$item.href
    }
    $sections = [System.Collections.Generic.List[object]]::new()
    $position = 0
    foreach ($itemref in $opf.SelectNodes('//*[local-name()="spine"]/*[local-name()="itemref"]')) {
      $href = $items[[string]$itemref.idref]
      if (-not $href -or $href -notmatch '\.(xhtml|html|htm)$') { continue }
      $entryName = if ($opfDir) { "$opfDir/$href" } else { $href }
      $entryName = $entryName.Replace('\', '/')
      $entry = $zip.GetEntry($entryName)
      if (-not $entry) { continue }
      $html = Read-ZipEntryText $entry
      $text = Convert-HtmlToText $html
      if ($text.Length -lt 120) { continue }
      $title = Get-FirstHeading -Html $html -Fallback ("Section {0}" -f ($position + 1))
      $sections.Add([pscustomobject]@{ Position = $position; Title = $title; Text = $text })
      $position++
    }
    return $sections
  } finally {
    $zip.Dispose()
  }
}

function Split-TextChunks {
  param([string]$Text, [int]$MaxChars, [int]$Overlap)
  $paragraphs = $Text -split '(\r?\n){2,}' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  $result = [System.Collections.Generic.List[string]]::new()
  $current = ''
  foreach ($raw in $paragraphs) {
    $p = ($raw -replace '\s+', ' ').Trim()
    if (-not $p) { continue }
    while ($p.Length -gt $MaxChars) {
      if ($current) { $result.Add($current.Trim()); $current = '' }
      $cut = $MaxChars
      $space = $p.LastIndexOf(' ', $MaxChars - 1)
      if ($space -gt [Math]::Floor($MaxChars * 0.6)) { $cut = $space }
      $result.Add($p.Substring(0, $cut).Trim())
      $resume = [Math]::Max(0, $cut - $Overlap)
      $p = $p.Substring($resume).Trim()
    }
    $candidate = if ($current) { "$current`n`n$p" } else { $p }
    if ($candidate.Length -le $MaxChars) { $current = $candidate; continue }
    $result.Add($current.Trim())
    $tailStart = [Math]::Max(0, $current.Length - $Overlap)
    $tail = $current.Substring($tailStart).Trim()
    $current = if ($tail) { "$tail`n`n$p" } else { $p }
  }
  if ($current) { $result.Add($current.Trim()) }
  return $result
}

try {
  foreach ($book in $Catalog) {
    $sourcePath = Join-Path $SourceDir $book.source_file
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      $Errors.Add("Missing source: $($book.source_file)")
      continue
    }
    $file = Get-Item -LiteralPath $sourcePath
    $sha = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($SeenHashes.ContainsKey($sha)) {
      $Errors.Add("Duplicate hash skipped: $($book.source_file) matches $($SeenHashes[$sha])")
      continue
    }
    $SeenHashes[$sha] = $book.source_file
    $deployedSource = $null
    $chunkCount = 0
    $contentChars = 0

    if ($book.license_status -eq 'public_domain_us') {
      $ext = $file.Extension.ToLowerInvariant()
      $canonicalName = "$($book.external_id)-$($book.slug)$ext"
      $destination = Join-Path $SourcesOut $canonicalName
      Copy-Item -LiteralPath $sourcePath -Destination $destination -Force
      $deployedSource = "sources/public-domain/$canonicalName"

      if ($file.Extension -ieq '.epub') {
        $sections = Get-EpubSections -Path $sourcePath
        $chunkIndex = 0
        foreach ($section in $sections) {
          $contentChars += $section.Text.Length
          $chunks = Split-TextChunks -Text $section.Text -MaxChars $MaxChunkChars -Overlap $OverlapChars
          foreach ($content in $chunks) {
            $contentHashBytes = [System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($content))
            $contentHash = [Convert]::ToHexString($contentHashBytes).ToLowerInvariant()
            $record = [ordered]@{
              document_external_id = $book.external_id
              chunk_index = $chunkIndex
              section_position = $section.Position
              section_title = $section.Title
              content = $content
              content_sha256 = $contentHash
              token_estimate = [Math]::Ceiling($content.Length / 4.0)
              categories = @($book.categories)
              theological_tier = $book.theological_tier
              ingestion_policy = $book.ingestion_policy
              risk_tags = @($book.risk_tags)
              retrieval_weight = [double]$book.retrieval_weight
            }
            $Writer.WriteLine(($record | ConvertTo-Json -Compress -Depth 8))
            $chunkIndex++
            $chunkCount++
            $TotalChunks++
          }
        }
      }
    }

    $Manifest.Add([ordered]@{
      external_id = $book.external_id
      title = $book.title
      author = $book.author
      source_file = $book.source_file
      deployed_source = $deployedSource
      source_sha256 = $sha
      source_bytes = $file.Length
      source_format = $file.Extension.TrimStart('.').ToLowerInvariant()
      categories = @($book.categories)
      theological_tier = $book.theological_tier
      ingestion_policy = $book.ingestion_policy
      license_status = $book.license_status
      risk_tags = @($book.risk_tags)
      retrieval_weight = [double]$book.retrieval_weight
      chunk_count = $chunkCount
      extracted_characters = $contentChars
      production_eligible = ($book.ingestion_policy -in @('production_rag', 'historical_rag', 'narrative_only'))
    })
  }
} finally {
  $Writer.Dispose()
}

$ManifestPath = Join-Path $OutputDir 'manifest.json'
[System.IO.File]::WriteAllText($ManifestPath, ($Manifest | ConvertTo-Json -Depth 10), $Utf8NoBom)
$Manifest | Select-Object external_id,title,author,source_format,license_status,ingestion_policy,theological_tier,retrieval_weight,chunk_count,source_sha256,deployed_source | Export-Csv -LiteralPath (Join-Path $OutputDir 'manifest.csv') -NoTypeInformation -Encoding utf8

$DuplicateFiles = Get-ChildItem -LiteralPath $SourceDir -File | Group-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } | Where-Object Count -gt 1 | ForEach-Object { [pscustomobject]@{ sha256 = $_.Name.ToLowerInvariant(); files = @($_.Group.Name) } }
$Qa = [ordered]@{
  generated_at_utc = [DateTime]::UtcNow.ToString('o')
  source_directory = $SourceDir
  catalog_entries = $Catalog.Count
  manifest_entries = $Manifest.Count
  production_eligible_documents = @($Manifest | Where-Object production_eligible).Count
  blocked_documents = @($Manifest | Where-Object { -not $_.production_eligible }).Count
  total_chunks = $TotalChunks
  duplicate_groups = @($DuplicateFiles)
  errors = @($Errors)
}
[System.IO.File]::WriteAllText((Join-Path $ReportsOut 'qa-report.json'), ($Qa | ConvertTo-Json -Depth 10), $Utf8NoBom)

Write-Output ("Built {0} documents and {1} chunks in {2}" -f $Manifest.Count, $TotalChunks, $OutputDir)
if ($Errors.Count -gt 0) { $Errors | ForEach-Object { Write-Warning $_ } }

