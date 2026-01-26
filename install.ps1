$ErrorActionPreference = "Stop"

function Show-Usage {
  @"
llm Installer (PowerShell)

Usage: Install-Llm [options]

Options:
  -h, --help              Show this help
  -v, --version <version> Install a specific version (e.g., 0.0.1)
  --install-runtime       Install Node.js runtime if missing (default)

Examples:
  powershell -c "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm --install-runtime"
  powershell -c "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm --version 0.0.1"
"@
}

function Install-Llm {
  param(
    [string[]]$ArgsList = $args
  )

  $requestedVersion = $env:VERSION
  $installRuntime = $true

  for ($i = 0; $i -lt $ArgsList.Length; $i++) {
    $arg = $ArgsList[$i]
    switch ($arg) {
      "-h" { Show-Usage; return }
      "--help" { Show-Usage; return }
      "-v" {
        if ($i + 1 -lt $ArgsList.Length) {
          $requestedVersion = $ArgsList[$i + 1]
          $i++
        } else {
          Write-Error "Error: --version requires a version argument"
          return
        }
      }
      "--version" {
        if ($i + 1 -lt $ArgsList.Length) {
          $requestedVersion = $ArgsList[$i + 1]
          $i++
        } else {
          Write-Error "Error: --version requires a version argument"
          return
        }
      }
      "--install-runtime" { $installRuntime = $true }
      default {
        Write-Warning "Unknown option '$arg'"
      }
    }
  }

  $hasNode = $false
  if (Get-Command node -ErrorAction SilentlyContinue) {
    $hasNode = $true
  }

  function Install-Node {
    Write-Host "Installing Node.js via fnm..."
    try {
      irm https://fnm.vercel.app/install.ps1 | iex
    } catch {
      Write-Warning "fnm installation failed."
      return Install-NodeWithWinget
    }

    try {
      fnm env --shell powershell | Out-String | Invoke-Expression
      fnm install --lts | Out-Null
      fnm use --lts | Out-Null
      if (Get-Command node -ErrorAction SilentlyContinue) {
        return $true
      }
      Write-Warning "fnm installed, but node was not found in PATH."
      return Install-NodeWithWinget
    } catch {
      Write-Warning "Node.js installation via fnm failed."
      return Install-NodeWithWinget
    }
  }

  function Install-NodeWithWinget {
    $downloadUrl = "https://nodejs.org/en/download"
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
      Write-Warning "winget is not available. Opening Node.js download page."
      Start-Process $downloadUrl | Out-Null
      Write-Error "Please install Node.js LTS manually, reopen PowerShell, then re-run this installer."
      return $false
    }

    Write-Host "Installing Node.js via winget..."
    try {
      & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null
      if (Get-Command node -ErrorAction SilentlyContinue) {
        return $true
      }
      Write-Warning "Node.js installation via winget failed. Opening download page."
      Start-Process $downloadUrl | Out-Null
      Write-Error "Please install Node.js LTS manually, reopen PowerShell, then re-run this installer."
      return $false
    } catch {
      Write-Warning "Node.js installation via winget failed. Opening download page."
      Start-Process $downloadUrl | Out-Null
      Write-Error "Please install Node.js LTS manually, reopen PowerShell, then re-run this installer."
      return $false
    }
  }

  if (-not $hasNode -and $installRuntime) {
    if (Install-Node) {
      $hasNode = $true
    } else {
      Write-Error "Error: Failed to install Node.js runtime."
      return
    }
  }

  $runtime = ""
  if ($hasNode) {
    $runtime = "node"
  }

  $filename = "llm-windows-x64.zip"
  if ($runtime -eq "node") {
    $filename = "llm-node.zip"
  }

  $baseUrl = "https://github.com/taoalpha/llm/releases/latest/download"
  if ($requestedVersion) {
    $requestedVersion = $requestedVersion.TrimStart("v")
    $baseUrl = "https://github.com/taoalpha/llm/releases/download/v$requestedVersion"
  }

  $url = "$baseUrl/$filename"
  $installDir = $env:LOCALAPPDATA
  $tmpDir = Join-Path $env:TEMP ("llm-install-" + [guid]::NewGuid().ToString())
  $zipPath = Join-Path $tmpDir $filename

  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

  try {
    try {
      Invoke-WebRequest -Uri $url -OutFile $zipPath
    } catch {
    if ($runtime -eq "node") {
      Write-Warning "Runtime bundle not found, falling back to standalone binary."
      $runtime = ""
        $filename = "llm-windows-x64.zip"
        $url = "$baseUrl/$filename"
        $zipPath = Join-Path $tmpDir $filename
        Invoke-WebRequest -Uri $url -OutFile $zipPath
      } else {
        throw
      }
    }

    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

    if ($runtime -eq "node") {
      $src = Join-Path $tmpDir "llm-node.js"
    }

    if ($runtime -eq "node") {
      if (-not (Test-Path $src)) {
        Write-Error "Downloaded archive does not contain expected file: $src"
        return
      }

      $jsDest = Join-Path $installDir "llm-node.js"
      Copy-Item -Force $src $jsDest

      $cmdDest = Join-Path $installDir "llm.cmd"
      $cmdContent = @'
@echo off
set "LLM_SCRIPT=%~dp0llm-node.js"
node "%LLM_SCRIPT%" %*
'@
      Set-Content -Path $cmdDest -Value $cmdContent -Encoding ASCII

      Write-Host "Installed to $cmdDest"
    } else {
      $src = Join-Path $tmpDir "llm-windows-x64.exe"
      if (-not (Test-Path $src)) {
        Write-Error "Downloaded archive does not contain expected binary: $src"
        return
      }

      $dest = Join-Path $installDir "llm.exe"
      Copy-Item -Force $src $dest
      Write-Host "Installed to $dest"
    }
  } finally {
    if (Test-Path $tmpDir) {
      Remove-Item -Recurse -Force $tmpDir
    }
  }

  $pathContains = $env:PATH.Split(";") | Where-Object { $_ -eq $installDir }
  if (-not $pathContains) {
    $newPath = $env:PATH + ";" + $installDir
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $installDir to your PATH (User)."
    Write-Host "Reopen your terminal to use 'llm'."
  }
}

if ($MyInvocation.MyCommand.Path) {
  Install-Llm @args
}
