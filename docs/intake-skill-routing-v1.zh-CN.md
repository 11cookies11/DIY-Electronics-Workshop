# 前台接待 Skill 路由与 Second Me 协同

## 对话底座

以下能力不作为正式 skill，而是作为前台的基础对话层：

- 打招呼
- 简短寒暄
- 感谢回应
- 平滑接话

这层优先保证“像人在聊天”，不主动推进事务状态。

## 事务型 Skills

当前前台接待只保留这些事务型 skills：

- `capability-intro`
- `lab-intro`
- `solution-intro`
- `requirement-clarifier`
- `preview-promoter`
- `handoff-promoter`

## 路由原则

1. 先跑对话底座。
2. 如果命中基础对话且没有新增结构化信息，直接返回自然回复。
3. 如果用户进入明确任务意图，再进入 skill 路由。
4. 如果 preview 已可生成，优先进入 `preview-promoter`。
5. 如果 handoff 已可生成且未确认项较少，优先进入 `handoff-promoter`。
6. 其余情况进入 `requirement-clarifier`。

## Second Me 协同策略

建议分两层：

- 本地规则优先
  - 对话底座
  - `lab-intro`
  - `solution-intro`
- Second Me 优先
  - `requirement-clarifier`
  - `preview-promoter`
  - `handoff-promoter`

原因：

- 前两类更稳定，适合本地快速响应。
- 后三类更依赖上下文理解、自然追问和总结能力，适合交给 Second Me。

## 运行建议

- 当未连接 Second Me 时：
  - 继续走本地 skill 编排和本地需求提取
- 当已连接 Second Me 且有可用 chat 模型时：
  - 保留本地路由
  - 只把需要“生成式理解”的事务 skill 交给 Second Me

## 当前代码映射

- 对话底座：`src/lib/intake/conversation-base.ts`
- 事务型 skills：`src/lib/intake/skills.ts`
- workflow 编排：`src/lib/intake/workflow.ts`
