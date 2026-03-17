# 前台 Agent 验收记录

日期：2026-03-17

## 验收方式

- 本地启动 `npm run dev`
- 通过 `/api/intake/chat` 做多轮对话
- 通过 `/api/intake/session` 检查会话内状态是否被正确持久化

## 场景 1：从寒暄推进到 preview 和 handoff

对话：
1. `你好呀`
2. `我想做一个家里用的万能遥控器，带触屏、红外、蓝牙和 Wi-Fi，内置充电电池`
3. `可以，来吧`
4. `那就整理交接单吧`

结果：
- 第 1 轮停在 `collecting`
- 第 2 轮进入 `preview_ready`
- 第 3 轮进入 `preview_generated`，并暴露 `preview_input_draft`
- 第 4 轮进入 `handoff_ready`，并暴露 `lab_handoff`
- `/api/intake/session` 中能读到持久化后的 `handoff`

结论：
- 多轮对话主链路通过
- preview 触发与 handoff 触发链路通过

## 场景 2：信息不足时不允许抢跑

对话：
1. `我想做一个万能遥控器，带触屏、红外、蓝牙和 Wi-Fi`
2. `可以，来吧`

结果：
- 两轮都停在 `clarifying`
- `next_action` 保持 `ask_more`
- 不暴露 `preview_input_draft`
- 风险中明确提示供电和使用场景未确认

结论：
- “确认语抢跑”被挡住
- preview 不会在关键信息缺失时提前生成

## 当前已验证能力

- 寒暄与需求澄清可以自然切换
- 典型设备需求可以推进到 `preview_ready`
- 用户确认后可以生成 `preview_input_draft`
- 预览完成后可以推进到 `handoff_ready`
- 会话状态可以通过 session 接口读回
- 关键信息缺失时会阻止抢跑生成 preview

## 当前仍需继续优化的点

- `handoff_ready` 之后，回复仍可能继续追问未确认的小项，语气上还可以再收得更像真人接待
- 多轮记忆与确认层目前已部分生效，但还没有独立抽成完整配置层
