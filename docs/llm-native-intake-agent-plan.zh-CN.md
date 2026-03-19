# LLM-native Intake Agent 改造现状（2026-03）

## 目标

将前台 intake 流程从“规则先决”升级为“LLM 主导决策 + 程序 guardrail 执行”：

- LLM 主导：阶段判断、unknowns 语义判断、single focus、next action、preview/handoff readiness 倾向。
- 程序兜底：schema 校验、状态持久化、工具执行（preview/handoff）、高风险 guardrail 与展示边界。

## 当前实现落点

核心文件：

- `src/lib/intake/workflow.ts`
- `src/lib/intake/llm-native.ts`
- `src/lib/intake/readiness.ts`
- `src/lib/intake/orchestration.ts`
- `src/components/lab/ChatInterface.tsx`
- `scripts/intake-probe.mjs`

当前主链路（`runIntakeWorkflow`）：

1. 程序抽取本地 confirmed 与 reasoning patch（可选）。
2. 生成 baseline unknowns/risks 与候选 preview/handoff。
3. 调用 LLM-native decision，返回结构化字段（含 `agent_stage`、`unknowns`、`next_action` 等）。
4. 程序将 LLM unknowns 与 guardrail unknowns 合并，并做字段归一（避免同义重复追问）。
5. `resolveWorkflowControl` 负责 readiness/nextAction/expose 的执行层决策。
6. 回复优先级：`llm customer_reply` > chat model 生成 > fallback 回复。
7. `buildWorkflowDebugInfo` 输出前端调试字段。

## 已完成的关键迁移

- 规则路由执行路径已移除关键词 fallback（路由由 LLM decision 映射）。
- unknowns 改为 LLM 语义判断优先，程序只做最小安全兜底。
- single focus 与 next action 由 LLM decision 主导，程序负责可执行性校验。
- preview/handoff readiness 采用 “LLM 倾向 + 程序 guardrail” 双层机制。
- probe 已覆盖：
  - 模糊表达转明确需求
  - 纠错回合（不是 A，是 B）
  - preview -> handoff 连续推进
  - 同义 unknown 字段归一（避免重复追问）
- 前端 debug 面板已展示：
  - `llm stage`
  - `llm next`
  - `llm ready`
  - `llm focus`
  - `llm unknowns`

## 仍在推进的事项

- 继续瘦身 `runIntakeWorkflow`，将前置派生逻辑抽离为独立 helper（保持行为不变）。
- 将历史遗留注释/死代码块清理，降低维护噪音。
- 持续扩充 probe 与真实对话回归样例。

## Guardrail 边界（必须保留）

- `buildStructuredIntakeOutput` 的输出 shape 不破坏前端兼容。
- `validateLlmNextAction` 保证 LLM 的动作是可执行动作。
- `decideReadinessFlow` 仍负责最终 exposure 边界（何时真正展示 preview/handoff）。
- 无论 LLM 输出如何，程序都必须保证：
  - 状态可序列化
  - 工具调用可执行
  - 高风险场景不越权。

## 验证方式

- 类型检查：`npm exec tsc --noEmit`
- 回归脚本：`node scripts/intake-probe.mjs`

通过标准：

- 编译无错误；
- probe 场景全通过；
- debug 字段在前端可见且与 decision 一致。
