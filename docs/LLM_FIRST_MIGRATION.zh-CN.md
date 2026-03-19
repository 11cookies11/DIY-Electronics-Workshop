# LLM-First（DeepSeek）迁移说明

## 目标
将 intake Agent 调整为 LLM 主导（约 80-90% 决策由模型完成），仅保留 10-20% 轻逻辑护栏。

## 必要环境变量
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`（默认可用 `https://api.deepseek.com`）
- `DEEPSEEK_CHAT_MODEL`（建议 `deepseek-chat`）

## 推荐 intake 专用变量
- `DEEPSEEK_INTAKE_CHAT_MODEL`
- `DEEPSEEK_INTAKE_REASONING_MODEL`
- `INTAKE_LLM_FIRST_MODE=true`

## 兼容变量（可选）
如果不想改现有部署脚本，也可以继续使用：
- `SECONDME_CHAT_MODEL`
- `SECONDME_INTAKE_CHAT_MODEL`
- `SECONDME_INTAKE_REASONING_MODEL`
- `SECONDME_CHAT_API_KEY`

系统会按 DeepSeek/LLM 变量优先，再回退到 SECONDME 变量。

## 当前护栏（保留逻辑）
- 状态底线：防止非法状态跳转
- 重复追问抑制：同焦点重复追问后切换为“总结 + 选项式补全”
- 明确意图强制触发：用户明确要 preview 时可带假设生成
- 失败回退：模型异常时回到可恢复对话

## 上线前检查
1. `npm run build`
2. `node scripts/repro-preview-consent.mjs`
3. `node scripts/diy-agent-e2e.mjs`

## 已知说明
- 测试脚本会在 `.where/*-runtime` 生成临时运行产物（已在 `.gitignore` 忽略）。
- `secondme-client.ts` 当前是“通用 LLM 网关层”，名称为兼容历史调用保留。
