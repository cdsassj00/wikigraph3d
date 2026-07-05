<# 
Starts wikigraph3d on Windows, even for users who do not know whether Node.js
is installed. It checks Node.js/npm/npx, offers a winget Node.js LTS install,
then launches the GitHub package with npx.
#>
[CmdletBinding()]
param(
  [string]$Package = "github:cdsassj00/wikigraph3d#master",
  [switch]$NoRun,
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$MinimumNodeMajor = 18

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-CommandOrNull($Name) {
  Get-Command $Name -ErrorAction SilentlyContinue
}

function Get-ToolPath($Name) {
  $cmdShim = Get-Command "$Name.cmd" -ErrorAction SilentlyContinue
  if ($cmdShim) {
    return $cmdShim.Source
  }

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  return $null
}

function Add-CommonNodePaths {
  $candidates = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate "node.exe"))) {
      if (($env:Path -split ";") -notcontains $candidate) {
        $env:Path = "$candidate;$env:Path"
      }
    }
  }
}

function Get-NodeInfo {
  Add-CommonNodePaths
  if (-not (Get-CommandOrNull "node")) {
    return @{ Installed = $false; Version = $null; Major = 0; Ready = $false }
  }

  try {
    $version = (& node -p "process.versions.node" 2>$null).Trim()
    $major = [int]($version.Split(".")[0])
    return @{
      Installed = $true
      Version = $version
      Major = $major
      Ready = ($major -ge $MinimumNodeMajor)
    }
  } catch {
    return @{ Installed = $true; Version = $null; Major = 0; Ready = $false }
  }
}

function Show-ManualInstallHelp {
  Write-Host ""
  Write-Host "Manual install:"
  Write-Host "  1. Install Node.js LTS from https://nodejs.org/en/download"
  Write-Host "  2. Close and reopen PowerShell"
  Write-Host "  3. Run:"
  Write-Host "     npx --yes $Package"
}

function Install-NodeWithWinget {
  if (-not (Get-CommandOrNull "winget")) {
    Write-Host "winget was not found on this PC."
    Start-Process "https://nodejs.org/en/download"
    Show-ManualInstallHelp
    exit 1
  }

  Write-Step "Node.js LTS install"
  Write-Host "Node.js $MinimumNodeMajor+ is required. This script can install Node.js LTS with winget."
  $answer = Read-Host "Install Node.js LTS now? [Y/n]"
  if ($answer -and $answer.Trim().ToLowerInvariant().StartsWith("n")) {
    Show-ManualInstallHelp
    exit 1
  }

  & winget install --id OpenJS.NodeJS.LTS -e --source winget
  Add-CommonNodePaths
}

Write-Step "Checking Node.js"
$node = Get-NodeInfo

if ($node.Ready) {
  Write-Host "Node.js v$($node.Version) found."
} else {
  if ($node.Installed) {
    Write-Host "Node.js is installed, but version v$($node.Version) is too old. Need Node.js $MinimumNodeMajor+."
  } else {
    Write-Host "Node.js was not found."
  }

  if ($NoInstall) {
    Show-ManualInstallHelp
    exit 1
  }

  Install-NodeWithWinget
  $node = Get-NodeInfo
}

if (-not $node.Ready) {
  Write-Host ""
  Write-Host "Node.js still is not available in this PowerShell session."
  Write-Host "Close and reopen PowerShell, then run:"
  Write-Host "  npx --yes $Package"
  exit 1
}

$npmPath = Get-ToolPath "npm"
if (-not $npmPath) {
  Write-Host "npm was not found. Reinstall Node.js LTS or reopen PowerShell."
  exit 1
}

$npxPath = Get-ToolPath "npx"
if (-not $npxPath) {
  Write-Host "npx was not found. Reinstall Node.js LTS or reopen PowerShell."
  exit 1
}

Write-Host "npm $((& $npmPath --version 2>$null).Trim()) found."
Write-Host "npx $((& $npxPath --version 2>$null).Trim()) found."

if ($NoRun) {
  Write-Host ""
  Write-Host "Ready. Run this when you want to start wikigraph3d:"
  Write-Host "  npx --yes $Package"
  exit 0
}

Write-Step "Starting wikigraph3d"
& $npxPath --yes $Package
