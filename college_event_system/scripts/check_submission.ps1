param(
  [string]$FinalSubmissionDir = (Resolve-Path (Join-Path $PSScriptRoot "..\\final_submission")).Path
)

$ErrorActionPreference = "Stop"

function Ok($msg) { Write-Host "[OK]  $msg" }
function Warn($msg) { Write-Host "[WARN] $msg" }
function Fail($msg) { Write-Host "[FAIL] $msg" }

function Assert-File([string]$Path, [string]$Label) {
  if (Test-Path -LiteralPath $Path) { Ok "$Label exists: $Path"; return $true }
  Fail "$Label missing: $Path"; return $false
}

function Count-Images([string]$Dir) {
  if (!(Test-Path -LiteralPath $Dir)) { return 0 }
  (Get-ChildItem -LiteralPath $Dir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @(".png", ".jpg", ".jpeg") }).Count
}

Ok "Checking final submission folder: $FinalSubmissionDir"

$docsDir = Join-Path $FinalSubmissionDir "docs"
$shotsDir = Join-Path $FinalSubmissionDir "screenshots"

Assert-File (Join-Path $docsDir "instruction.md") "Docs: instruction.md" | Out-Null
Assert-File (Join-Path $docsDir "plan.md") "Docs: plan.md" | Out-Null
Assert-File (Join-Path $docsDir "todo.md") "Docs: todo.md" | Out-Null

$codeZip = Join-Path $FinalSubmissionDir "code.zip"
if (Assert-File $codeZip "Artifact: code.zip") {
  # Basic forbidden-content checks (does not extract)
  $forbidden = @("node_modules/", ".next/", "venv/", "__pycache__/", ".dart_tool/", ".idea/", ".env")
  $list = (& tar -tf $codeZip 2>$null)
  if (-not $list) {
    Warn "Could not list code.zip via tar. (If tar is unavailable, this check is skipped.)"
  } else {
    $hit = $false
    foreach ($f in $forbidden) {
      if ($list -match [regex]::Escape($f)) {
        $hit = $true
        Fail "code.zip contains forbidden path fragment: $f"
      }
    }
    if (-not $hit) { Ok "code.zip looks clean (no common forbidden folders/.env found)." }
  }
}

# Required final files (can’t be generated without real work)
Assert-File (Join-Path $FinalSubmissionDir "report.docx") "Document: report.docx" | Out-Null
Assert-File (Join-Path $FinalSubmissionDir "presentation.pptx") "Slides: presentation.pptx" | Out-Null
Assert-File (Join-Path $FinalSubmissionDir "app-release.apk") "APK: app-release.apk" | Out-Null

# Screenshots
if (Test-Path -LiteralPath $shotsDir) {
  Ok "Screenshots folder exists: $shotsDir"
} else {
  Fail "Screenshots folder missing: $shotsDir"
}

$tools = @("burpsuite", "nmap", "sqlmap", "nikto", "hydra", "wireshark", "cyberchef")
$secRoot = Join-Path $shotsDir "security_tools"
foreach ($t in $tools) {
  $dir = Join-Path $secRoot $t
  if (!(Test-Path -LiteralPath $dir)) {
    Warn "Security tool folder missing: $dir"
    continue
  }
  $c = Count-Images $dir
  if ($c -ge 3) { Ok "Security screenshots for ${t}: ${c} images" }
  else { Warn "Security screenshots for ${t}: ${c} images (expected 3)" }
}

$appShots = Join-Path $shotsDir "application"
if (!(Test-Path -LiteralPath $appShots)) {
  Warn "Application screenshots folder missing: $appShots"
} else {
  $c = Count-Images $appShots
  if ($c -gt 0) { Ok "Application screenshots: $c images" }
  else { Warn "Application screenshots: none found yet" }
}

Ok "Submission check complete."
