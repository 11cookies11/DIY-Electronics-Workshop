# 前台接待 Skill 联调样例

## 样例 1：纯寒暄

用户：
`你好呀`

预期：
- 走对话底座
- 不进入事务型 skill
- 不强行追问表单字段

## 样例 2：能力介绍

用户：
`你能做什么？`

预期：
- 命中 `capability-intro`
- 解释能聊天、能梳理需求、能生成 preview 和 handoff

## 样例 3：实验室介绍

用户：
`介绍一下实验室`

预期：
- 命中 `lab-intro`
- 介绍实验室定位和后续流程

## 样例 4：模糊需求澄清

用户：
`我想做一个手持设备`

预期：
- 命中 `requirement-clarifier`
- 自然追问使用场景、核心功能、交互方式

## 样例 5：可生成 preview

用户：
`我想做一个带触控屏和蓝牙的智能手表，电池供电，带 IMU 和 USB-C`

预期：
- 命中 `preview-promoter`
- 生成 `preview_input_draft`
- 回复中说明已能给出 3D 草案

## 样例 6：可生成 handoff

用户：
`这是给户外运动记录用的，重点是佩戴舒适和基础运动监测`

预期：
- 在已有 preview 草案基础上命中 `handoff-promoter`
- 输出 `lab_handoff`
- 回复中说明可以进入实验室评估
