#!/bin/bash
# Minimal, non-invasive review version of the SecondMe launch script.
# This file intentionally avoids installs, account login, config mutation,
# skill installation, and auto-launch behavior.

set -euo pipefail

SCRIPT_VERSION="1.0.0-lite"
LOGFILE="/tmp/secondme-launch-lite-$(date +%s).log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { echo -e "  ${BLUE}i${NC} $1" | tee -a "$LOGFILE"; }
success() { echo -e "  ${GREEN}ok${NC} $1" | tee -a "$LOGFILE"; }
warn()    { echo -e "  ${YELLOW}!${NC} $1" | tee -a "$LOGFILE"; }
fail()    { echo -e "  ${RED}x${NC} $1" | tee -a "$LOGFILE"; }
step()    { echo -e "\\n${BOLD}[$1/4]${NC} $2" | tee -a "$LOGFILE"; }

echo "" | tee "$LOGFILE"
echo -e "${BOLD}SecondMe launch lite v${SCRIPT_VERSION}${NC}" | tee -a "$LOGFILE"
echo -e "${DIM}This variant only inspects your environment and reports what the full script would do.${NC}" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

step 1 "Environment check"

if command -v node >/dev/null 2>&1; then
    success "Node.js detected: $(node -v)"
else
    warn "Node.js not found"
    info "Full script would install nvm and Node.js LTS here"
fi

if command -v npm >/dev/null 2>&1; then
    success "npm detected: $(npm -v)"
else
    warn "npm not found"
fi

step 2 "Claude Code check"

if command -v claude >/dev/null 2>&1; then
    success "Claude Code detected: $(claude --version 2>/dev/null || echo installed)"
else
    warn "Claude Code not found"
    info "Full script would run: npm install -g @anthropic-ai/claude-code"
fi

step 3 "Config mutation preview"

CLAUDE_SETTINGS_DIR="${HOME}/.claude"
CLAUDE_SETTINGS_FILE="${CLAUDE_SETTINGS_DIR}/settings.json"

if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
    warn "Existing Claude settings found: $CLAUDE_SETTINGS_FILE"
    info "Full script may overwrite this file after prompting"
else
    info "No Claude settings file found"
    info "Full script would create: $CLAUDE_SETTINGS_FILE"
fi

info "Disabled in this lite version:"
info "- No Kimi API key prompts"
info "- No Claude login flow"
info "- No writes to ~/.claude/settings.json"
info "- No proxy environment changes"

step 4 "Skills and launch preview"

info "Disabled in this lite version:"
info "- No frontend-design skill install"
info "- No Mindverse/Second-Me-Skills install"
info "- No exec claude \"/secondme\""

echo ""
echo -e "${GREEN}${BOLD}Review complete${NC}" | tee -a "$LOGFILE"
echo -e "  Log: ${DIM}$LOGFILE${NC}" | tee -a "$LOGFILE"
echo ""
