#Requires -Version 5.1
<#
  Desinstalacao de emergencia — ControleExped v1.2 (Electron / NSIS) e versoes antigas.
  Use quando o Painel de Controlo nao desinstala ou o botao Desinstalar nao faz nada.

  Como executar (PowerShell):
    1. Copia este ficheiro para o PC Windows.
    2. Clica direito no PowerShell > Executar como administrador (recomendado).
    3.  cd pasta\onde\esta\o\script
    4.  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    5.  .\windows-force-uninstall.ps1

  Opcional (so apaga pastas/registo, sem tentar o desinstalador NSIS):
    .\windows-force-uninstall.ps1 -SkipUninstaller
#>
[CmdletBinding()]
param(
  [switch]$SkipUninstaller
)

$ErrorActionPreference = "Continue"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Stop-AppProcesses {
  @("ControleExped", "ControleExpdDesktop", "ControleExpd", "Controle Expedicao") | ForEach-Object {
    Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -like "*ControleExped*" -or
        $_.CommandLine -like "*ControleExpdDesktop*" -or
        $_.CommandLine -like "*ControleExpd*" -or
        $_.CommandLine -like "*controleexped*" -or
        $_.CommandLine -like "*controleexpd*" -or
        $_.CommandLine -like "*controle-expedicao*"
      )
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Get-UninstallKeys {
  param([Microsoft.Win32.RegistryHive]$Hive)
  if ($Hive -eq [Microsoft.Win32.RegistryHive]::LocalMachine) {
    $roots = @("HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall", "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall")
  } else {
    $roots = @("HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall")
  }
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          Path         = $_.PSPath
          DisplayName  = $p.DisplayName
          Publisher    = $p.Publisher
          InstallLocation = $p.InstallLocation
          UninstallString = $p.UninstallString
          QuietUninstallString = $p.QuietUninstallString
        }
      } catch { }
    }
  }
}

function Test-MatchApp {
  param($row)
  if ($row.DisplayName) {
    $dn = [string]$row.DisplayName
    if ($dn -match "ControleExped v1\.2") { return $true }
    if ($dn -match "ControleExped") { return $true }
    if ($dn -match "ControleExpd Desktop") { return $true }
    if ($dn -match "Controle Expedicao") { return $true }
    if ($dn -match "controle-expedicao") { return $true }
  }
  if ($row.InstallLocation) {
    $loc = [string]$row.InstallLocation
    if ($loc -match "ControleExped v1\.2") { return $true }
    if ($loc -match "ControleExped") { return $true }
    if ($loc -match "ControleExpd Desktop") { return $true }
    if ($loc -match "Controle Expedicao") { return $true }
  }
  return $false
}

function Invoke-NsisSilentUninstall {
  param([string]$uninstallString)
  if (-not $uninstallString) { return $false }
  $s = $uninstallString.Trim()
  $exe = $null
  if ($s -match '^"([^"]+\.exe)"') {
    $exe = $Matches[1]
  } elseif ($s -match '^([^"]+\.exe)\b') {
    $exe = $Matches[1].Trim()
  }
  if (-not $exe -or -not (Test-Path -LiteralPath $exe)) { return $false }
  Write-Host "A executar desinstalador NSIS em silencio: $exe"
  $p = Start-Process -FilePath $exe -ArgumentList "/S" -PassThru -Wait -WindowStyle Hidden
  return ($true)
}

Write-Host "=== ControleExped v1.2 / versoes antigas — desinstalacao de emergencia ===" -ForegroundColor Cyan
if (-not (Test-IsAdmin)) {
  Write-Host "Aviso: sem privilegios de administrador. Pastas em Program Files podem falhar." -ForegroundColor Yellow
}

Stop-AppProcesses
Start-Sleep -Seconds 1

$candidates = @()
$candidates += Get-UninstallKeys -Hive CurrentUser
$candidates += Get-UninstallKeys -Hive LocalMachine
$matches = $candidates | Where-Object { Test-MatchApp $_ } | Sort-Object Path -Unique

if ($matches.Count -eq 0) {
  Write-Host "Nenhuma entrada de desinstalacao encontrada com o nome esperado. Continua limpeza de pastas..." -ForegroundColor Yellow
} else {
  foreach ($m in $matches) {
    Write-Host "Encontrado: $($m.DisplayName) [$($m.Path)]"
    if (-not $SkipUninstaller) {
      $quiet = $m.QuietUninstallString
      $un = $m.UninstallString
      if ($quiet) { Invoke-NsisSilentUninstall $quiet | Out-Null }
      elseif ($un) { Invoke-NsisSilentUninstall $un | Out-Null }
    }
  }
}

Stop-AppProcesses

$folderHints = @(
  (Join-Path $env:LOCALAPPDATA "Programs\ControleExped v1.2")
  (Join-Path $env:LOCALAPPDATA "ControleExped v1.2")
  (Join-Path ${env:ProgramFiles} "ControleExped v1.2")
  (Join-Path ${env:ProgramFiles(x86)} "ControleExped v1.2")
  (Join-Path $env:LOCALAPPDATA "Programs\ControleExpd Desktop")
  (Join-Path $env:LOCALAPPDATA "ControleExpd Desktop")
  (Join-Path ${env:ProgramFiles} "ControleExpd Desktop")
  (Join-Path ${env:ProgramFiles(x86)} "ControleExpd Desktop")
  (Join-Path $env:LOCALAPPDATA "Programs\Controle Expedicao")
  (Join-Path $env:LOCALAPPDATA "Controle Expedicao")
  (Join-Path ${env:ProgramFiles} "Controle Expedicao")
  (Join-Path ${env:ProgramFiles(x86)} "Controle Expedicao")
)

foreach ($dir in $folderHints) {
  if (Test-Path -LiteralPath $dir) {
    Write-Host "A remover pasta: $dir"
    Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

foreach ($m in $matches) {
  $loc = $m.InstallLocation
  if ($loc -and (Test-Path -LiteralPath $loc)) {
    Write-Host "A remover InstallLocation: $loc"
    Remove-Item -LiteralPath $loc -Recurse -Force -ErrorAction SilentlyContinue
  }
  try {
    Write-Host "A remover registo: $($m.Path)"
    Remove-Item -LiteralPath $m.Path -Recurse -Force -ErrorAction SilentlyContinue
  } catch { }
}

# Atalhos
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
if (Test-Path $startMenu) {
  Get-ChildItem $startMenu -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "ControleExped v1\.2|ControleExped|ControleExpd Desktop|Controle Expedicao|ControleExpd" } |
    ForEach-Object { Remove-Item $_.FullName -Force -Recurse -ErrorAction SilentlyContinue }
}

$desktop = [Environment]::GetFolderPath("Desktop")
Get-ChildItem $desktop -Filter "*.lnk" -ErrorAction SilentlyContinue |
  ForEach-Object {
    $sh = New-Object -ComObject WScript.Shell
    try {
      $t = $sh.CreateShortcut($_.FullName).TargetPath
      if ($t -match "ControleExped|ControleExpdDesktop|ControleExpd|Controle Expedicao") {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
      }
    } catch { }
  }

Write-Host "`nFeito. Reinicia o PC se o Painel de Controlo ainda mostrar a entrada." -ForegroundColor Green
Write-Host "Se algo ficou preso, apaga manualmente a pasta de instalacao e usa a ferramenta da Microsoft:" -ForegroundColor Gray
Write-Host "  https://support.microsoft.com/help/17588" -ForegroundColor Gray
