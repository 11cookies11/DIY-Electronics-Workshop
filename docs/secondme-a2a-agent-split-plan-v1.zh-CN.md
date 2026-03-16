# Second Me A2A 多 Agent 拆分规划 v1

## 目标

在当前统一入口 Agent 设计基础上，规划后续拆分成多 Agent 的方式。

目标不是立刻拆分，而是：

- 让当前单入口设计保持可扩展
- 为后续 A2A 编排提供稳定节点
- 明确每个 Agent 的职责边界、输入输出和调用顺序

## 推荐拆分结果

建议拆成 4 个 Agent：

1. `Intake Agent`
2. `Preview Agent`
3. `Lab Handoff Agent`
4. `Coordinator Agent`

## 1. Intake Agent

### 职责

- 与客户对话
- 识别意图
- 收集需求
- 追问缺失字段
- 输出结构化需求摘要

### 输入

- 客户消息
- 当前会话状态

### 输出

- `requirement_summary`
- `confirmed`
- `unknowns`
- `risks`
- `next_action`

### 不负责

- 生成 3D 场景
- 生成实验室交接单最终版本
- 做复杂编排

## 2. Preview Agent

### 职责

- 判断 preview 是否就绪
- 生成 `PreviewInput draft`
- 调用当前 3D preview pipeline
- 返回 preview 草案摘要

### 输入

- 结构化需求
- 设备类型
- 已确认的硬件信息

### 输出

- `preview_readiness`
- `preview_input_draft`
- `preview_summary`
- `preview_issues`

### 不负责

- 和客户多轮追问
- 生成实验室 handoff

## 3. Lab Handoff Agent

### 职责

- 将结构化需求整理成实验室交接单
- 输出缺失项与风险
- 给出推荐下一步

### 输入

- 结构化需求
- 可选的 preview 草案

### 输出

- `lab_handoff`
- `unknowns`
- `risks`
- `recommended_next_step`

### 不负责

- 客户接待
- preview 生成

## 4. Coordinator Agent

### 职责

- 判断应该调用哪个 Agent
- 管理状态机
- 汇总结果
- 决定是否继续追问、生成 preview、准备 handoff 或转人工

### 输入

- 当前会话状态
- Intake / Preview / Handoff 各 Agent 返回值

### 输出

- `workflow_state`
- `next_action`
- 最终给前端的聚合结果

### 不负责

- 代替其他 Agent 产出专业内容

## 推荐调用顺序

### 标准路径

1. 客户消息进入 `Coordinator Agent`
2. `Coordinator` 调用 `Intake Agent`
3. 如果 `next_action === generate_preview`
   - 调用 `Preview Agent`
4. 如果 `next_action === prepare_handoff` 或 `handoff_to_lab`
   - 调用 `Lab Handoff Agent`
5. `Coordinator` 汇总并返回

## 推荐状态流

### 路径 A：需求还不够

- Coordinator
- Intake
- 返回 `ask_more`

### 路径 B：足够生成草案

- Coordinator
- Intake
- Preview
- 返回 `preview_generated`

### 路径 C：足够交接实验室

- Coordinator
- Intake
- 可选 Preview
- Lab Handoff
- 返回 `handoff_ready` / `handoff_completed`

## 节点输入输出总表

### Intake Agent

- 输入：客户消息、当前状态
- 输出：需求摘要、确认项、缺失项、风险、下一步

### Preview Agent

- 输入：已确认硬件需求
- 输出：`PreviewInput draft`、preview 摘要、问题列表

### Lab Handoff Agent

- 输入：需求摘要、硬件需求、preview 草案
- 输出：`LabHandoff`

### Coordinator Agent

- 输入：所有子 Agent 输出
- 输出：聚合结果、状态、动作

## 为什么这样拆分

这种拆分的好处是：

- 对外仍然像一个 Agent
- 对内每个节点职责清楚
- 方便后续独立优化 prompt
- Preview 和实验室交接可单独演化
- 更符合 Second Me A2A 的协作方式

## 单 Agent 到多 Agent 的演进路径

### v1

先保持单入口 Agent，对外统一。

内部只是逻辑分层，不一定真拆服务。

### v2

把 Preview 逻辑拆成独立 Agent 或独立服务节点。

### v3

把 Lab Handoff 逻辑拆成独立 Agent。

### v4

引入显式 Coordinator 做真正的 A2A 编排。

## 最小落地建议

如果要最省成本地落地，建议：

- 前端只接一个入口
- 后端先实现一个 Coordinator 服务
- 内部按 4 个逻辑块组织代码
- 先不拆成 4 个独立部署单元

这样可以同时获得：

- 简单实现
- 清晰架构
- 后续平滑拆分能力

## 一句话总结

最推荐的 A2A 路径不是一开始就做很多松散 Agent，而是：

**先做一个统一入口，再按 Intake、Preview、Lab Handoff、Coordinator 四层逐步拆分。**
