# Renders every slide of the PPTX to PNG using the locally installed Microsoft PowerPoint (COM automation).
# Usage: powershell -File scripts/pptx-to-png.ps1 [-Pptx output\KATALIS-ERP-Proposal.pptx] [-Out output\_render\pptx]
param(
  [string]$Pptx = "output\KATALIS-ERP-Proposal.pptx",
  [string]$Out = "output\_render\pptx"
)
$ErrorActionPreference = "Stop"
$pptxFull = (Resolve-Path $Pptx).Path
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$outFull = (Resolve-Path $Out).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($pptxFull, $true, $false, $false)
  $count = $pres.Slides.Count
  Write-Output "Slides: $count"
  $pres.Export($outFull, "PNG", 1920, 1080)
  $pres.Close()
} finally {
  $app.Quit()
}
Get-ChildItem $outFull -Filter *.PNG | Sort-Object Name | Select-Object -First 3 Name
