# 前台 Agent 典型状态流转说明

本文档描述当前前台接待 Agent 在仓库中的实际流转方式，重点对应以下实现：

- 状态与输出定义：`src/lib/intake/types.ts`
- 技能路由：`src/lib/intake/skills.ts`
- 回复编排：`src/lib/intake/orchestration.ts`
- 触发判断：`src/lib/intake/transitions.ts`
- 就绪决策：`src/lib/intake/readiness.ts`
- 工作流主流程：`src/lib/intake/workflow.ts`
- 前端反馈展示：`src/components/lab/ChatInterface.tsx`

## 1. 当前状态集合

- `collecting`
  还在接住寒暄、介绍实验室或刚开始收集需求。
- `clarifying`
  已进入需求线程，但关键字段还不够，继续追问。
- `preview_ready`
  已具备生成 preview 草案的条件，但还没正式触发生成。
- `preview_generated`
  用户明确确认后，已经暴露 `preview_input_draft`，主舞台可切到 AI 生成方案。
- `handoff_ready`
  已经具备实验室交接条件，并暴露 `lab_handoff`。
- `handoff_completed`
  类型中预留，当前主流程里还没有单独推进到这个状态。
- `blocked`
  类型中预留，当前主流程里还没有单独的阻塞分支实现。

## 2. 主链路怎么走

最典型的一条链路是：

`collecting -> clarifying -> preview_ready -> preview_generated -> handoff_ready`

对应体验如下：

1. 用户先寒暄、问实验室介绍或简单抛出想法，系统通常停在 `collecting`。
2. 一旦消息里开始出现设备类型、场景、交互、功能、供电等信息，系统进入 `clarifying`。
3. 当 `previewDraft` 已可由已确认信息推导出来，但用户还没有明确说“生成预览”，系统进入 `preview_ready`。
4. 当用户明确确认生成预览，系统进入 `preview_generated`，并对外暴露 `preview_input_draft`。
5. 当交接材料已可整理，且用户明确要推进交接，系统进入 `handoff_ready`，并对外暴露 `lab_handoff`。

## 3. preview 何时算准备好

`previewDraft` 由 `mapConfirmedToPreviewDraft(...)` 生成。当前至少需要这些信息基本成立：

- 有设备类型
- 有使用场景
- 有交互方式
  通过屏幕、控制件或端口至少覆盖一类
- 有供电方式
- 有主要功能模块
  通过核心功能、传感器或连接方式至少覆盖一类

如果这些条件不够，就不会生成 `previewDraft`，工作流也不会进入 `preview_ready`。

## 4. preview 何时真正触发

仅仅有 `previewDraft` 还不够，真正触发还需要用户给出明确推进信号。

当前判断逻辑在 `src/lib/intake/transitions.ts`：

- `canPreview = Boolean(previewDraft)`
- `shouldTriggerPreview` 成立的条件：
  - 用户消息命中了“想看预览 / 生成草案”一类信号
  - 或当前状态已经是 `preview_ready`，且用户给出肯定确认
  - 同时用户不能是在否定或打断

触发后，`decideReadinessFlow(...)` 会返回：

- `workflowState = "preview_generated"`
- `nextAction = "generate_preview"`
- `exposePreview = true`

这时前端会发生两件事：

- 聊天接口返回 `preview_input_draft`
- 主舞台通过 `onPreviewDraft(...)` 切到 AI 生成方案

聊天面板现在也会显示一条显性反馈：

- `3D 草案已生成`
- 提示主舞台已经切到 AI 方案，可以直接旋转和拆解查看

## 5. handoff 何时能准备

`labHandoff` 由 `buildLabHandoff(...)` 生成。当前最低条件是：

- 有 `device_type`
- 并且满足以下之一：
  - 已有 `core_features`
  - 或已有 `previewDraft`

此外，真正允许进入交接推动态还要求：

- `labHandoff` 已存在
- `unknowns.length <= 2`

也就是说，当前实现允许带少量未确认项进入交接，但不会在缺口太多时直接放行。

## 6. handoff 何时真正触发

当前判断逻辑同样在 `src/lib/intake/transitions.ts`：

- `canHandoff = Boolean(labHandoff) && unknowns.length <= 2`
- `shouldTriggerHandoff` 成立的条件：
  - 用户明确表示要整理交接单、推进实验室交接
  - 或当前状态已经是 `handoff_ready`，用户再次肯定确认
  - 或当前状态是 `preview_generated`，用户明确说要继续交给实验室
  - 同时用户不能是在否定

触发后，`decideReadinessFlow(...)` 会返回：

- `workflowState = "handoff_ready"`
- `nextAction = "prepare_handoff"`
- `exposePreview = true`
- `exposeHandoff = true`

前端反馈会同步加强：

- 聊天面板出现 `实验室交接单已整理`
- 面板内直接给出 `打开交接单` 入口
- 底部仍保留原有的交接单链接入口

## 7. 哪些情况不会推进状态

以下几类消息会有意放慢推进节奏：

- 纯寒暄、问能力介绍、问实验室介绍，而且还没采集到核心需求
  - `orchestration` 会走 `stay_conversational`
  - 工作流保持在 `collecting`
- 用户是否定、打断或纠正
  - 不会直接触发 preview / handoff
  - 更倾向先回到接待或澄清
- 需求字段还不足以形成 `previewDraft`
  - 最多进入 `clarifying`

## 8. 当前前端可见反馈

围绕状态流转，前端现在能看到三层反馈：

- 调试层
  - 显示 `workflow_state`、`active_skill`、`next_action`、`unknowns`、`risks`
- 阶段反馈层
  - `preview_ready` 时提示已经进入预览准备阶段
  - `preview_generated` 时提示 3D 草案已生成
  - `handoff_ready` 时提示实验室交接单已整理并提供入口
- 结果层
  - `preview_input_draft` 会驱动主舞台切到 AI 生成方案
  - `lab_handoff` 会生成独立的 handoff 页面入口

## 9. 当前实现的两个保留点

- `handoff_completed`
  - 类型和规范里都有，但工作流里还没有单独一跳把 `handoff_ready` 再推进为 `handoff_completed`
- `blocked`
  - 目前风险会进入 `risks`，但还没有单独的阻塞状态编排与专门 UI

这两个状态后续可以作为“联调与收尾”阶段继续补齐。
