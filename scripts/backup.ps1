$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Path backups -Force | Out-Null
$file = Join-Path (Get-Location) ("backups/classpet-$(Get-Date -Format yyyyMMdd-HHmmss).sql")
$info = New-Object System.Diagnostics.ProcessStartInfo
$info.FileName = 'docker'
$info.Arguments = 'compose exec -T mysql sh /usr/local/bin/classpet-backup'
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.CreateNoWindow = $true
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $info
$stream = $null
try {
    [void]$process.Start()
    $stream = [System.IO.File]::Create($file)
    $process.StandardOutput.BaseStream.CopyTo($stream)
    $stream.Dispose(); $stream = $null
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { Remove-Item $file -ErrorAction SilentlyContinue; throw 'Backup failed. Check Docker and MySQL status.' }
    Write-Host "Saved: $file"
} finally { if ($stream) { $stream.Dispose() }; $process.Dispose() }
