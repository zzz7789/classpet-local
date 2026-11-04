param([Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$path = (Resolve-Path $File).Path
$answer = Read-Host 'This replaces existing tables. Back up current data first. Type RESTORE to continue'
if ($answer -ne 'RESTORE') { Write-Host 'Cancelled'; exit 1 }
$info = New-Object System.Diagnostics.ProcessStartInfo
$info.FileName = 'docker'
$info.Arguments = 'compose exec -T mysql sh /usr/local/bin/classpet-restore'
$info.UseShellExecute = $false
$info.RedirectStandardInput = $true
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $info
$stream = $null
try {
    [void]$process.Start()
    $stream = [System.IO.File]::OpenRead($path)
    $stream.CopyTo($process.StandardInput.BaseStream)
    $stream.Dispose(); $stream = $null
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Restore failed. Check Docker and MySQL status.' }
    Write-Host 'Restored. Run: docker compose restart backend'
} finally { if ($stream) { $stream.Dispose() }; $process.Dispose() }
