param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$targets = @(
  (Join-Path $ProjectRoot "nextjs_website\\node_modules"),
  (Join-Path $ProjectRoot "nextjs_website\\.next"),
  (Join-Path $ProjectRoot "flask_api\\venv"),
  (Join-Path $ProjectRoot "flask_api\\__pycache__"),
  (Join-Path $ProjectRoot "flutter_app\\.dart_tool"),
  (Join-Path $ProjectRoot "flutter_app\\build"),
  (Join-Path $ProjectRoot "flutter_app\\.idea")
)

foreach ($t in $targets) {
  if (Test-Path $t) {
    Write-Host "Removing: $t"
    Remove-Item -Recurse -Force $t
  }
}

Write-Host "Done."

