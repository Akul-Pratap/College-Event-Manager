param(
  [string]$FinalSubmissionDir = (Resolve-Path (Join-Path $PSScriptRoot "..\\final_submission")).Path
)

$ErrorActionPreference = "Stop"

function Require([string]$Path, [string]$Label) {
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing $Label at: $Path"
  }
}

$report = Join-Path $FinalSubmissionDir "report.docx"
$ppt = Join-Path $FinalSubmissionDir "presentation.pptx"
$apk = Join-Path $FinalSubmissionDir "app-release.apk"
$shots = Join-Path $FinalSubmissionDir "screenshots"
$codeZip = Join-Path $FinalSubmissionDir "code.zip"

Require $report "report.docx"
Require $ppt "presentation.pptx"
Require $apk "app-release.apk"
Require $shots "screenshots/"
Require $codeZip "code.zip"

$outZip = Join-Path $FinalSubmissionDir "final_submission.zip"
if (Test-Path -LiteralPath $outZip) {
  Remove-Item -Force -LiteralPath $outZip
}

$staging = Join-Path $FinalSubmissionDir "_staging_final"
if (Test-Path -LiteralPath $staging) {
  Remove-Item -Recurse -Force -LiteralPath $staging
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Copy-Item -LiteralPath $report -Destination (Join-Path $staging "report.docx") -Force
Copy-Item -LiteralPath $ppt -Destination (Join-Path $staging "presentation.pptx") -Force
Copy-Item -LiteralPath $apk -Destination (Join-Path $staging "app-release.apk") -Force
Copy-Item -LiteralPath $codeZip -Destination (Join-Path $staging "code.zip") -Force
Copy-Item -LiteralPath $shots -Destination (Join-Path $staging "screenshots") -Recurse -Force

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $outZip -Force

for ($i = 0; $i -lt 6; $i++) {
  try {
    if (Test-Path -LiteralPath $staging) {
      Remove-Item -Recurse -Force -LiteralPath $staging
    }
    break
  } catch {
    Start-Sleep -Seconds (1 + $i)
    if ($i -eq 5) {
      Write-Warning "Could not remove staging directory (file lock). Delete it later: $staging"
    }
  }
}

Write-Host "Created: $outZip"

