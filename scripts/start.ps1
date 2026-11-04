$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    # Per-user Docker Desktop installs may not add the CLI to PATH.
    $dockerCandidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'),
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin')
    )
    foreach ($dockerBin in $dockerCandidates) {
        if (Test-Path (Join-Path $dockerBin 'docker.exe')) {
            $env:PATH = "$dockerBin;$env:PATH"
            break
        }
    }
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI was not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running. Start Docker Desktop and try again.' }
if (-not (Test-Path '.env')) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    function New-LocalSecret { $bytes = New-Object byte[] 24; $rng.GetBytes($bytes); return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant() }
    $envText = "APP_HOST=127.0.0.1`nAPP_PORT=8080`nMYSQL_PASSWORD=$(New-LocalSecret)`nMYSQL_ROOT_PASSWORD=$(New-LocalSecret)`n"
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $envText, (New-Object System.Text.UTF8Encoding($false)))
    $rng.Dispose()
}
& docker compose up -d --build --wait --wait-timeout 240
if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Run: docker compose logs --tail=100' }
$line = Get-Content .env | Where-Object { $_ -match '^APP_PORT=' } | Select-Object -First 1
$port = if ($line) { ($line -split '=',2)[1].Trim() } else { '8080' }
$url = "http://127.0.0.1:$port"
Write-Host "Ready: $url"
Start-Process $url
