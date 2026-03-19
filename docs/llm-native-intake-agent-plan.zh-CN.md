# LLM-native Intake Agent 改造基线

## 当前程序主导的决策点

- `src/lib/intake/workflow.ts`
  - `deriveConfirmed` 通过关键词、正则和少量上下文规则直接抽取 `confirmed`
  - `computeUnknowns` 直接决定哪些槽位算“还没答”
  - `buildPreviewReadiness` 直接决定 preview 缺口
  - `mapConfirmedToPreviewDraft` 在规则满足时直接生成 preview candidate
  - `inferIntent` 通过词面规则判断 intent
- `src/lib/intake/orchestration.ts`
  - `planReplyOrchestration` 直接决定 `singleFocus`、`transitionMode`、`priorities`
  - archetype 偏好顺序由程序写死
- `src/lib/intake/readiness.ts`
  - `decideReadinessFlow` 直接决定 `workflowState`、`nextAction`、preview/handoff expose 时机
- `src/lib/intake/skills.ts`
  - `routeIntakeSkills` 通过规则切换 capability / preview / handoff 等路线
- `src/lib/intake/memory.ts`
  - `analyzeConversationMemory` 用规则判断 answering / correcting / gratitude 等模式

## 当前 LLM 的角色

- reasoning model
  - 通过 `buildModelRequirementPatch` 返回字段 patch
  - 只能补充或替换局部字段，不主导整体决策
- chat model
  - 通过 `buildModelCustomerReply` 生成自然语言回复
  - 主要负责把程序已经决定好的路径说得更自然

## 与 LLM-native 目标的差距

- 当前是程序先决定：
  - 哪些信息已回答
  - 还缺什么
  - 现在在哪个阶段
  - 下一步问什么
  - 何时可以 preview / handoff
- LLM 只在两处参与：
  - 做字段 patch
  - 做面向用户的话术包装

## 目标状态

- LLM 主导：
  - 当前对话阶段判断
  - 槽位是否已被粗粒度或细粒度回答
  - 下一步应该追问、总结、preview 还是 handoff
  - preview / handoff candidate readiness 的语义判断
- 程序负责：
  - schema 校验
  - 状态持久化
  - preview / handoff 工具执行
  - 高风险 guardrail
  - UI 展示与暴露时机

## 迁移原则

- 不直接删除现有规则层，先把它们降级为 guardrail
- LLM 输出必须结构化，且可重试校验
- readiness 采用“LLM 判断 + 程序校验”双层机制
- 用户可见回复与机器可执行决策分离

## 第一阶段落点

- 定义统一的 LLM-native 输出 schema
- 保留现有 state shape 兼容前端
- 在 workflow 中增加一条新的 agent decision 通路
- 先让 LLM 接管 `unknowns`、`single_focus`、`next_action`
- 程序仍保留 preview / handoff 执行和兜底判断
