$ErrorActionPreference = "Stop"

$script:LogFile = Join-Path $env:TEMP ("secondme-codex-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + ".log")
$script:CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$script:SkillsDir = Join-Path $script:CodexHome "skills"
$script:InstallerDir = Join-Path $script:SkillsDir ".system\skill-installer\scripts"
$script:Installer = Join-Path $script:InstallerDir "install-skill-from-github.py"

function Write-Log {
    param(
        [string]$Prefix,
        [string]$Message
    )

    $line = "[$Prefix] $Message"
    $line | Tee-Object -FilePath $script:LogFile -Append
}

function Write-Info { param([string]$Message) Write-Log "INFO" $Message }
function Write-Ok { param([string]$Message) Write-Log " OK " $Message }
function Write-Warn { param([string]$Message) Write-Log "WARN" $Message }
function Write-Fail { param([string]$Message) Write-Log "FAIL" $Message }

function Get-PythonCommand {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @("py", "-3")
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }
    throw "Python not found. Install Python 3 before running this script."
}

function Invoke-External {
    param(
        [string[]]$CommandParts
    )

    Write-Info ("Running: " + ($CommandParts -join " "))
    & $CommandParts[0] @($CommandParts[1..($CommandParts.Length - 1)])
}

function Install-Skill {
    param(
        [string]$Repo,
        [string]$Path,
        [string]$SkillName
    )

    $destination = Join-Path $script:SkillsDir $SkillName
    if (Test-Path $destination) {
        Write-Warn "Skill already exists, skipping install: $SkillName"
        return
    }

    $python = Get-PythonCommand
    $command = @($python + @($script:Installer, "--repo", $Repo, "--path", $Path))
    Invoke-External -CommandParts $command
    Write-Ok "Installed skill: $SkillName"
}

function Patch-FileContent {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return
    }

    $content = Get-Content -Raw -Path $Path
    $updated = $content

    $updated = $updated.Replace('`AskUserQuestion`', '`request_user_input`')
    $updated = $updated.Replace('CLAUDE.md', 'AGENTS.md')
    $updated = $updated.Replace('.claude/', '.codex/')
    $updated = $updated.Replace('/secondme-init', '`$secondme-init')
    $updated = $updated.Replace('/secondme-prd', '`$secondme-prd')
    $updated = $updated.Replace('/secondme-nextjs', '`$secondme-nextjs')
    $updated = $updated.Replace('/secondme-reference', '`$secondme-reference')
    $updated = $updated.Replace('/secondme', '`$secondme')
    $updated = $updated.Replace('`frontend-design:frontend-design`', '`frontend-design`')

    $compatibilityNote = @'
## Codex Compatibility

- In Codex, treat references like `/secondme` as `$secondme`.
- If the skill says to use `AskUserQuestion` or `request_user_input`, prefer asking the user directly with concise plain-text questions unless Plan mode is explicitly available.
- Write persistent project guidance to `AGENTS.md` instead of `CLAUDE.md`.
- Keep existing skill intent and workflow, but adapt the interaction style to Codex conventions.

'@

    if ($updated -notmatch '## Codex Compatibility') {
        if ($updated.StartsWith("---")) {
            $parts = $updated -split "---", 3
            if ($parts.Length -eq 3) {
                $updated = "---" + $parts[1] + "---`r`n`r`n" + $compatibilityNote + $parts[2].TrimStart("`r", "`n")
            }
            else {
                $updated = $compatibilityNote + $updated
            }
        }
        else {
            $updated = $compatibilityNote + $updated
        }
    }

    if ($updated -ne $content) {
        Set-Content -Path $Path -Value $updated -Encoding UTF8
        Write-Ok "Patched skill file: $Path"
    }
}

function Patch-InstalledSkills {
    $skillFiles = @(
        (Join-Path $script:SkillsDir "secondme\SKILL.md"),
        (Join-Path $script:SkillsDir "secondme-init\SKILL.md"),
        (Join-Path $script:SkillsDir "secondme-prd\SKILL.md"),
        (Join-Path $script:SkillsDir "secondme-nextjs\SKILL.md"),
        (Join-Path $script:SkillsDir "secondme-reference\SKILL.md")
    )

    foreach ($file in $skillFiles) {
        Patch-FileContent -Path $file
    }
}

Write-Info "SecondMe Codex bootstrap"
Write-Info "Log file: $script:LogFile"

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    Write-Fail "codex command not found. Install Codex first, then rerun this script."
    exit 1
}

if (-not (Test-Path $script:Installer)) {
    Write-Fail "Codex skill installer not found: $script:Installer"
    exit 1
}

New-Item -ItemType Directory -Force -Path $script:SkillsDir | Out-Null

Install-Skill -Repo "openai/skills" -Path "skills/.curated/frontend-design" -SkillName "frontend-design"
Install-Skill -Repo "Mindverse/Second-Me-Skills" -Path "skills/secondme" -SkillName "secondme"
Install-Skill -Repo "Mindverse/Second-Me-Skills" -Path "skills/secondme-init" -SkillName "secondme-init"
Install-Skill -Repo "Mindverse/Second-Me-Skills" -Path "skills/secondme-prd" -SkillName "secondme-prd"
Install-Skill -Repo "Mindverse/Second-Me-Skills" -Path "skills/secondme-nextjs" -SkillName "secondme-nextjs"
Install-Skill -Repo "Mindverse/Second-Me-Skills" -Path "skills/secondme-reference" -SkillName "secondme-reference"

Patch-InstalledSkills

Write-Ok "SecondMe skills are ready for Codex."
Write-Info "You can invoke them in Codex with prompts like `$secondme or `$secondme-init."
Write-Info "Launching Codex..."

Start-Process codex
