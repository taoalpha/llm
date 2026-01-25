$ErrorActionPreference = "Stop"

function Show-Usage {
  @"
llm Installer (PowerShell)

Usage: Install-Llm [options]

Options:
  -h, --help              Show this help
  -v, --version <version> Install a specific version (e.g., 0.0.1)
  --install-runtime       Install Bun runtime if missing

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
  $installRuntime = $false

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

  $hasBun = $false
  if (Get-Command bun -ErrorAction SilentlyContinue) {
    $hasBun = $true
  }

  if ($installRuntime -and -not $hasBun) {
    Write-Host "Bun runtime not found. Installing Bun..."
    try {
      irm https://bun.sh/install.ps1 | iex
    } catch {
      Write-Error "Error: Bun installation failed."
      return
    }
    if (Get-Command bun -ErrorAction SilentlyContinue) {
      $hasBun = $true
    } else {
      Write-Error "Error: Bun installation did not add bun to PATH."
      return
    }
  }

  $useBunBuild = $hasBun
  $filename = "llm-windows-x64.zip"
  if ($useBunBuild) {
    $filename = "llm-bun.zip"
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
      if ($useBunBuild) {
        Write-Warning "Bun-optimized build not found, falling back to standalone binary."
        $useBunBuild = $false
        $filename = "llm-windows-x64.zip"
        $url = "$baseUrl/$filename"
        $zipPath = Join-Path $tmpDir $filename
        Invoke-WebRequest -Uri $url -OutFile $zipPath
      } else {
        throw
      }
    }

    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

    if ($useBunBuild) {
      $src = Join-Path $tmpDir "llm-bun.js"
      if (-not (Test-Path $src)) {
        Write-Error "Downloaded archive does not contain expected file: $src"
        return
      }

      $jsDest = Join-Path $installDir "llm-bun.js"
      Copy-Item -Force $src $jsDest

      $cmdDest = Join-Path $installDir "llm.cmd"
      $cmdContent = "@echo off`r`n" +
        'set "LLM_SCRIPT=%~dp0llm-bun.js"' + "`r`n" +
        'bun "%LLM_SCRIPT%" %*' + "`r`n"
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
