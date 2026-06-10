# Push Surna to GitHub (run after: gh auth login)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$gh = Join-Path $PWD ".tools\gh\bin\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error "GitHub CLI not found at $gh"
}

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "GitHub CLI is not authenticated." -ForegroundColor Yellow
  Write-Host "Run this in your terminal, then complete the browser step:" -ForegroundColor Yellow
  Write-Host "  .\.tools\gh\bin\gh.exe auth login -h github.com -p https -w" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Or set GH_TOKEN with a personal access token, then re-run this script." -ForegroundColor Yellow
  exit 1
}

$owner = if ($env:GITHUB_OWNER) { $env:GITHUB_OWNER } else { "surna-app" }
$repoName = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "surna" }
$remoteUrl = "https://github.com/$owner/$repoName.git"

git remote remove origin 2>$null
git remote add origin $remoteUrl

$repoExists = $false
try {
  & $gh repo view "$owner/$repoName" 2>$null | Out-Null
  $repoExists = $true
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  Write-Host "Creating repo $owner/$repoName ..."
  & $gh repo create $repoName --private --source=. --remote=origin --push
  exit $LASTEXITCODE
}

Write-Host "Repo exists - pushing main..."
git push -u origin main
Write-Host ("Done: " + $remoteUrl)
