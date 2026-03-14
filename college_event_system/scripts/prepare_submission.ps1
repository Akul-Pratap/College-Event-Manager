param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$FinalSubmissionDir = (Resolve-Path (Join-Path $PSScriptRoot "..\\final_submission")).Path
)

$ErrorActionPreference = "Stop"

function Assert-Path([string]$Path, [string]$Label) {
  if (!(Test-Path $Path)) {
    throw "Missing $Label at: $Path"
  }
}

Assert-Path $ProjectRoot "project root"
Assert-Path $FinalSubmissionDir "final_submission directory"

$staging = Join-Path $FinalSubmissionDir "_staging_code"
$zipPath = Join-Path $FinalSubmissionDir "code.zip"

if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

function Copy-Tree([string]$Source, [string]$Dest) {
  Assert-Path $Source "source directory"
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null

  $excludeDirs = @(
    "node_modules",
    ".next",
    "out",
    "build",
    "dist",
    ".vercel",
    "venv",
    ".venv",
    "__pycache__",
    ".dart_tool",
    ".idea"
  )

  $excludeFiles = @(
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".env.test",
    ".flutter-plugins",
    ".flutter-plugins-dependencies",
    "*.apk",
    "*.aab",
    "*.log"
  )

  $args = @(
    $Source,
    $Dest,
    "/E",
    "/NFL", "/NDL", "/NJH", "/NJS", "/NP"
  )

  foreach ($d in $excludeDirs) { $args += @("/XD", $d) }
  foreach ($f in $excludeFiles) { $args += @("/XF", $f) }

  & robocopy @args | Out-Null

  # Robocopy "success" exit codes are 0-7. 8+ indicates a failure.
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed for '$Source' -> '$Dest' (exit code: $LASTEXITCODE)"
  }

  # Extra safety: remove any .env* files that might have slipped through.
  Get-ChildItem -Recurse -Force -File $Dest -Filter ".env*" -ErrorAction SilentlyContinue | Remove-Item -Force
}

Copy-Tree (Join-Path $ProjectRoot "nextjs_website") (Join-Path $staging "nextjs_website")
Copy-Tree (Join-Path $ProjectRoot "flask_api")      (Join-Path $staging "flask_api")
Copy-Tree (Join-Path $ProjectRoot "flutter_app")    (Join-Path $staging "flutter_app")

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force

for ($i = 0; $i -lt 6; $i++) {
  try {
    if (Test-Path $staging) {
      Remove-Item -Recurse -Force $staging
    }
    break
  } catch {
    Start-Sleep -Seconds (1 + $i)
    if ($i -eq 5) {
      Write-Warning "Could not remove staging directory (file lock). You can delete it manually later: $staging"
    }
  }
}

Write-Host "Created: $zipPath"
