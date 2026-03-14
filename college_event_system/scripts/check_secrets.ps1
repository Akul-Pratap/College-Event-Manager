param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Warn($msg) { Write-Host "[WARN] $msg" }
function Ok($msg) { Write-Host "[OK]  $msg" }

# Heuristic: flag env-like files that look non-template (no "your_" / "example") and contain key-ish tokens.
# Use -like patterns to avoid regex escaping pitfalls.
$envFiles = Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like ".env*" -or $_.Name -like "*.env*" } |
  Select-Object -ExpandProperty FullName

if (-not $envFiles -or $envFiles.Count -eq 0) {
  Ok "No .env* files found under: $Root"
  exit 0
}

$keyLike = '(?i)(sk_|pk_|re_|AIza|xoxb-|ghp_|service_role|anon_key|clerk|supabase|cloudinary|resend|upstash|firebase|groq|gemini)'

foreach ($p in $envFiles) {
  try {
    $t = Get-Content -LiteralPath $p -Raw -ErrorAction Stop
  } catch {
    Warn "Could not read: $p"
    continue
  }

  $hasPlaceholder = ($t -match '(?i)\byour_|example|changeme')
  $hasKeyLike = ($t -match $keyLike)

  if ($hasKeyLike -and -not $hasPlaceholder) {
    Warn "Likely real secrets in: $p (do not commit or include in zips)"
    # Print only variable NAMES, never values.
    $names =
      ($t -split "`n") |
      Where-Object { $_ -match '^[A-Z0-9_]+\\s*=' } |
      ForEach-Object { ($_ -split '=',2)[0].Trim() } |
      Select-Object -Unique
    if ($names -and $names.Count -gt 0) {
      Write-Host "      Keys present:" $names
    }
  } else {
    Ok "Env file looks template/safe-ish: $p"
  }
}
