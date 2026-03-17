#!/bin/bash
# ============================================
# SecondMe 一键安装脚本 v1.0.0
# ============================================

SCRIPT_VERSION="1.0.0"
LOGFILE="/tmp/secondme-setup-$(date +%s).log"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { echo -e "  ${BLUE}▸${NC} $1" | tee -a "$LOGFILE"; }
success() { echo -e "  ${GREEN}✔${NC} $1" | tee -a "$LOGFILE"; }
warn()    { echo -e "  ${YELLOW}!${NC} $1" | tee -a "$LOGFILE"; }
fail()    { echo -e "  ${RED}✖${NC} $1" | tee -a "$LOGFILE"; }
step()    { echo -e "\\n${BOLD}[$1/4]${NC} $2" | tee -a "$LOGFILE"; }

# ── 中途退出清理 ──
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        warn "安装已中止"
        echo "  日志文件: ${DIM}$LOGFILE${NC}"
    fi
}
trap cleanup EXIT INT TERM

# ── 网络重试函数 ──
retry_command() {
    local max_attempts=3
    local attempt=1
    local cmd="$1"
    local desc="$2"

    while [ $attempt -le $max_attempts ]; do
        if eval "$cmd"; then
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                warn "$desc 失败，${max_attempts} 秒后重试 ($attempt/$max_attempts)..."
                sleep 3
            fi
            ((attempt++))
        fi
    done

    fail "$desc 失败（已重试 $max_attempts 次）"
    return 1
}

# 确保交互式输入来自终端（解决 curl | bash 下 stdin 被管道占用的问题）
if [ -t 0 ]; then
    exec 3<&0
else
    exec 3</dev/tty
fi

echo "" | tee "$LOGFILE"
echo -e "${BOLD}  ╔══════════════════════════════════╗${NC}" | tee -a "$LOGFILE"
echo -e "${BOLD}  ║   开始创造你的应用 v$SCRIPT_VERSION  ║${NC}" | tee -a "$LOGFILE"
echo -e "${BOLD}  ╚══════════════════════════════════╝${NC}" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

# ── 环境诊断（DEBUG模式）──
if [ "$DEBUG" = "1" ]; then
    echo "=== 环境诊断 ===" | tee -a "$LOGFILE"
    echo "OS: $(uname -s) $(uname -r)" | tee -a "$LOGFILE"
    echo "Shell: $SHELL" | tee -a "$LOGFILE"
    echo "Node: $(node -v 2>/dev/null || echo 'not found')" | tee -a "$LOGFILE"
    echo "npm: $(npm -v 2>/dev/null || echo 'not found')" | tee -a "$LOGFILE"
    echo "PWD: $(pwd)" | tee -a "$LOGFILE"
    echo "" | tee -a "$LOGFILE"
fi

# ── Step 1: 检查环境 ──
step 1 "检查环境依赖"

if ! command -v node &> /dev/null; then
    warn "未检测到 Node.js，正在自动安装..."

    export NVM_DIR="${HOME}/.nvm"
    if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
        info "安装 nvm (Node Version Manager)..."
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi
    # shellcheck source=/dev/null
    [ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

    info "安装 Node.js LTS..."
    nvm install --lts
    nvm use --lts

    if ! command -v node &> /dev/null; then
        fail "Node.js 自动安装失败，请手动安装: https://nodejs.org"
        exit 1
    fi
    success "Node.js $(node -v) 安装成功"
else
    success "Node.js $(node -v) / npm v$(npm -v 2>/dev/null || echo '未找到')"
fi

# ── Step 2: 安装 Claude Code ──
step 2 "安装 Claude Code"

if command -v claude &> /dev/null; then
    success "Claude Code 已安装 ($(claude --version 2>/dev/null || echo '已安装'))"
else
    info "正在安装 Claude Code..."
    # 网络重试
    if retry_command "npm install -g @anthropic-ai/claude-code 2>&1" "Claude Code 安装"; then
        success "Claude Code 安装成功"
    else
        fail "Claude Code 安装失败（已自动重试）"
        echo ""
        echo "  请尝试手动安装:"
        echo "    npm install -g @anthropic-ai/claude-code"
        echo ""
        echo "  如果遇到权限问题:"
        echo "    sudo npm install -g @anthropic-ai/claude-code"
        echo ""
        echo "  如果是网络问题，可以切换 npm 镜像源:"
        echo "    npm config set registry https://registry.npmmirror.com"
        echo ""
        exit 1
    fi
fi

# ── Step 3: 检查登录状态 ──
step 3 "检查 Claude Code 登录状态"

info "正在验证登录状态 (可能需要几秒)..."

# 关闭 set -e，防止 claude 命令失败时直接退出脚本
set +e
AUTH_RESULT=$(claude -p "respond with exactly the word AUTHENTICATED and nothing else" --max-turns 1 </dev/null 2>&1)
AUTH_EXIT=$?
set -e

if [ $AUTH_EXIT -ne 0 ] || [[ "$AUTH_RESULT" != *"AUTHENTICATED"* ]]; then
    warn "Claude Code 尚未配置可用的 AI 模型"
    echo ""
    echo -e "  ${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}  请选择你想使用的 AI 模型方案：${NC}"
    echo -e "  ${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}[1]${NC} ${BOLD}Kimi K2.5（推荐新手）${NC}"
    echo -e "      国内直连，无需翻墙"
    echo -e "      价格便宜（约 Claude 的 1/5）"
    echo -e "      新用户有免费额度"
    echo ""
    echo -e "  ${CYAN}[2]${NC} ${BOLD}Claude 官方账号${NC}"
    echo -e "      Anthropic 原生模型，效果最好"
    echo -e "      需要注册 Anthropic 账号"
    echo ""

    while true; do
        echo -ne "  请输入选项 ${BOLD}[1/2]${NC}: "
        read -r CHOICE <&3
        case "$CHOICE" in
            1) break ;;
            2) break ;;
            *) echo -e "  ${RED}请输入 1 或 2${NC}" ;;
        esac
    done

    # ─────────────────────────────
    # 方案 1: Kimi K2.5
    # ─────────────────────────────
    if [ "$CHOICE" = "1" ]; then
        echo ""
        echo -e "  ${BOLD}╭─────────────────────────────────────────╮${NC}"
        echo -e "  ${BOLD}│  配置 Kimi K2.5 模型                    │${NC}"
        echo -e "  ${BOLD}╰─────────────────────────────────────────╯${NC}"
        echo ""
        echo -e "  ${BOLD}第 1 步：注册 Moonshot 账号${NC}"
        echo ""
        echo -e "  请在浏览器打开: ${CYAN}https://platform.moonshot.cn${NC}"
        echo ""
        echo "  操作步骤："
        echo "    1. 点击「注册」，使用手机号注册"
        echo "    2. 完成实名认证（需要手机号 + 身份证）"
        echo "    3. 登录后进入控制台"
        echo ""
        echo -e "  ${BOLD}第 2 步：创建 API Key${NC}"
        echo ""
        echo "  操作步骤："
        echo "    1. 在左侧菜单找到「API Key 管理」"
        echo "    2. 点击「创建新的 API Key」"
        echo "    3. 复制生成的 Key（以 sk- 开头）"
        echo ""
        echo -e "  ${YELLOW}! API Key 只显示一次，请务必复制保存！${NC}"
        echo ""

        while true; do
            echo -ne "  请粘贴你的 Kimi API Key (sk-...): "
            read -r KIMI_KEY <&3
            if [[ "$KIMI_KEY" == sk-* ]]; then
                break
            else
                echo -e "  ${RED}API Key 应以 sk- 开头，请重新输入${NC}"
            fi
        done

        info "正在配置 Claude Code 连接 Kimi K2.5..."

        SETTINGS_DIR="${HOME}/.claude"
        SETTINGS_FILE="${SETTINGS_DIR}/settings.json"
        mkdir -p "$SETTINGS_DIR"

        # 幂等性：检查现有配置
        if [ -f "$SETTINGS_FILE" ]; then
            warn "检测到已有配置文件"
            echo -ne "  是否覆盖现有配置？[y/N]: "
            read -r OVERWRITE <&3
            if [[ "$OVERWRITE" != "y" && "$OVERWRITE" != "Y" ]]; then
                info "保留现有配置，跳过配置步骤"
                # 继续到下一步
                success "使用现有 Claude Code 配置"
            else
                cp "$SETTINGS_FILE" "${SETTINGS_FILE}.bak"
                info "已备份原配置到 settings.json.bak"

                # 写入新配置（禁用所有非必要网络请求，实现国内直连）
                cat > "$SETTINGS_FILE" << KIMIEOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.moonshot.cn/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "${KIMI_KEY}",
    "API_TIMEOUT_MS": "600000",
    "ANTHROPIC_MODEL": "kimi-k2.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "kimi-k2.5",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_DISABLE_TELEMETRY": "1",
    "CLAUDE_CODE_DISABLE_UPDATE_CHECK": "1",
    "ANTHROPIC_DISABLE_TELEMETRY": "1",
    "NO_UPDATE_NOTIFIER": "1"
  }
}
KIMIEOF
                success "Kimi K2.5 配置完成"
            fi
        else
            # 新建配置（禁用所有非必要网络请求，实现国内直连）
            cat > "$SETTINGS_FILE" << KIMIEOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.moonshot.cn/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "${KIMI_KEY}",
    "API_TIMEOUT_MS": "600000",
    "ANTHROPIC_MODEL": "kimi-k2.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "kimi-k2.5",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_DISABLE_TELEMETRY": "1",
    "CLAUDE_CODE_DISABLE_UPDATE_CHECK": "1",
    "ANTHROPIC_DISABLE_TELEMETRY": "1",
    "NO_UPDATE_NOTIFIER": "1"
  }
}
KIMIEOF
            success "Kimi K2.5 配置完成"
        fi
        echo ""

        info "验证 Kimi 连接..."

        # 只验证配置是否写入成功，不再调用 API
        # 因为 Kimi API 的连接验证可能因网络问题卡住
        if [ -f "$SETTINGS_FILE" ]; then
            if grep -q "api.moonshot.cn" "$SETTINGS_FILE" 2>/dev/null; then
                success "Kimi K2.5 配置成功"
                echo ""
                echo "  提示: 配置已保存，你可以直接使用 Claude Code"
                echo "  如果遇到连接问题，请检查:"
                echo "    - API Key 是否正确"
                echo "    - Moonshot 账号是否完成实名认证"
                echo ""
            else
                warn "配置文件可能不完整"
            fi
        else
            fail "配置文件未找到"
            exit 1
        fi

    # ─────────────────────────────
    # 方案 2: Claude 官方账号
    # ─────────────────────────────
    else
        echo ""
        echo -e "  ${BOLD}╭─────────────────────────────────────────╮${NC}"
        echo -e "  ${BOLD}│  登录 Claude 官方账号                   │${NC}"
        echo -e "  ${BOLD}╰─────────────────────────────────────────╯${NC}"
        echo ""
        echo -e "  ${BOLD}第 1 步：注册 Anthropic 账号${NC}"
        echo ""
        echo -e "  如果你还没有账号，请先在浏览器打开:"
        echo -e "  ${CYAN}https://console.anthropic.com${NC}"
        echo ""
        echo "  注册完成后回到这里继续。"
        echo ""
        echo -e "  ${BOLD}第 2 步：配置终端代理（科学上网）${NC}"
        echo ""
        echo -e "  ${YELLOW}! Claude 官方服务需要翻墙访问${NC}"
        echo ""
        echo "  如果你已经开启了代理软件（如 Clash、V2Ray、Shadowrocket 等），"
        echo "  还需要在终端中设置代理环境变量才能生效。"
        echo ""
        echo -e "  ${BOLD}常见代理端口：${NC}"
        echo "    Clash / ClashX    → 7890"
        echo "    V2RayU            → 1087"
        echo "    Shadowrocket      → 1086"
        echo ""
        echo -e "  请输入你的代理端口（直接回车跳过）："
        while true; do
            echo -ne "  端口号: "
            read -r PROXY_PORT <&3

            # 8. 代理端口输入错误验证
            if [ -z "$PROXY_PORT" ]; then
                break  # 用户跳过
            elif ! [[ "$PROXY_PORT" =~ ^[0-9]+$ ]]; then
                fail "端口号必须是数字"
                continue
            elif [ "$PROXY_PORT" -lt 1 ] || [ "$PROXY_PORT" -gt 65535 ]; then
                fail "端口号必须在 1-65535 之间"
                continue
            else
                break  # 有效端口
            fi
        done

        if [ -n "$PROXY_PORT" ]; then
            export http_proxy="http://127.0.0.1:${PROXY_PORT}"
            export https_proxy="http://127.0.0.1:${PROXY_PORT}"
            export all_proxy="socks5://127.0.0.1:${PROXY_PORT}"
            success "已设置代理 → 127.0.0.1:${PROXY_PORT}"
            # 快速测试代理连通性
            if curl -sf --connect-timeout 5 https://api.anthropic.com > /dev/null 2>&1; then
                success "代理连接正常，可以访问 Anthropic"
            else
                warn "无法通过代理访问 Anthropic，请检查代理是否正常运行"
                echo "  你可以继续尝试，或按 Ctrl+C 退出后排查代理问题"
            fi
        else
            info "跳过代理设置（如遇连接问题，请重新运行并配置代理）"
        fi
        echo ""
        echo -e "  ${BOLD}第 3 步：登录 Claude Code${NC}"
        echo ""
        echo "  接下来会启动 Claude Code 的登录流程，"
        echo "  它会自动打开浏览器让你授权。"
        echo ""
        echo -ne "  准备好了吗？按 ${BOLD}Enter${NC} 继续..."
        read -r <&3

        echo ""
        info "正在启动 Claude Code 登录..."
        echo ""
        echo -e "  ${DIM}────────────────────────────────────────${NC}"
        echo -e "  ${DIM}  Claude Code 登录界面（按照提示操作）${NC}"
        echo -e "  ${DIM}  登录成功后输入 /exit 退出${NC}"
        echo -e "  ${DIM}────────────────────────────────────────${NC}"
        echo ""

        claude <&3 || true

        echo ""
        info "验证登录状态..."
        set +e
        VERIFY_RESULT=$(claude -p "respond with exactly the word AUTHENTICATED and nothing else" --max-turns 1 </dev/null 2>&1)
        VERIFY_EXIT=$?
        set -e

        if [ $VERIFY_EXIT -ne 0 ] || [[ "$VERIFY_RESULT" != *"AUTHENTICATED"* ]]; then
            fail "登录验证失败，请重新运行安装命令"
            exit 1
        fi

        success "Claude 官方账号登录成功"
    fi
else
    success "Claude Code 已登录"
fi

# ── Step 4: 安装 Skills 并启动 ──
step 4 "安装 SecondMe Skills"

info "正在安装 Frontend Design Skill（SecondMe 前置依赖）..."
if retry_command "npx skills add anthropics/skills --skill frontend-design --yes </dev/null 2>&1" "Frontend Design Skill 安装"; then
    success "Frontend Design Skill 安装成功"
else
    warn "Frontend Design Skill 安装失败（已自动重试）"
    echo ""
fi

info "正在安装 Mindverse/Second-Me-Skills（带网络重试）..."
if retry_command "npx skills add Mindverse/Second-Me-Skills --yes </dev/null 2>&1" "SecondMe Skills 安装"; then
    success "SecondMe Skills 安装成功"
else
    warn "Skills 安装失败（已自动重试），但会尝试继续..."
    echo ""
    echo "  你可以稍后手动安装："
    echo "    npx skills add anthropics/skills --skill frontend-design"
    echo "    npx skills add Mindverse/Second-Me-Skills"
    echo ""
fi

# ── 启动 ──
echo ""
echo -e "  ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}${BOLD}  准备就绪！正在启动 SecondMe...${NC}"
echo -e "  ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${DIM}安装日志: $LOGFILE${NC}"
echo ""

exec claude "/secondme" <&3
