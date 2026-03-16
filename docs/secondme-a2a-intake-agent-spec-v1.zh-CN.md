# Second Me A2A 嵌入式需求接待 Agent 执行规范 v1

## 范围

本规范覆盖以下 4 项：

- Agent 的对外角色、边界与成功标准
- 客户接待对话状态机与关键转移条件
- 必问问题清单与需求采集字段
- `IntakeAgentOutput` 与 `LabHandoff` 的结构化 schema

对应规划见 [`.where-agent-progress.md`](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/.where-agent-progress.md)。

## 1. 对外角色与边界

### 角色名称

- 英文：`Embedded Project Intake Agent`
- 中文：`嵌入式项目需求接待 Agent`

### 对外职责

这个 Agent 对客户负责：

- 理解客户想做什么
- 澄清需求缺口
- 输出可理解的方案摘要
- 在信息足够时生成 3D preview 草案
- 输出可交给实验室继续处理的需求包

### 不负责的事情

这个 Agent 不直接负责：

- 最终器件选型
- 最终 BOM
- 成本承诺
- 交期承诺
- 量产级技术结论

### 成功标准

一次有效接待的完成标准是：

- 客户目标被清晰表述
- 核心硬件功能被采集
- 未确认项被明确标注
- 风险被明确标注
- 可以给出下一步动作
- 如信息足够，能生成 `PreviewInput draft`
- 如信息足够，能生成 `LabHandoff`

## 2. 对话状态机

### 状态列表

- `collecting`
- `clarifying`
- `preview_ready`
- `preview_generated`
- `handoff_ready`
- `handoff_completed`
- `blocked`

### 状态定义

#### `collecting`

初始接待状态。

目标：

- 识别客户意图
- 获取设备类型与使用场景

#### `clarifying`

信息不足时进入。

目标：

- 追问缺失字段
- 收敛模糊描述

#### `preview_ready`

已具备生成设备草案的基本信息。

目标：

- 生成 `PreviewInput draft`

#### `preview_generated`

已完成 3D preview 草案。

目标：

- 向客户解释当前草案
- 继续识别缺失项和风险

#### `handoff_ready`

信息足够交给实验室。

目标：

- 生成 `LabHandoff`

#### `handoff_completed`

交接信息已整理完毕。

目标：

- 输出最终交接包

#### `blocked`

当前信息不足、冲突过大，或问题超出 Agent 可处理范围。

目标：

- 明确说明阻塞原因
- 给出人工介入建议

### 转移条件

- `collecting -> clarifying`
  条件：基础信息不足
- `clarifying -> preview_ready`
  条件：设备类型、交互、主要模块、尺寸方向已明确
- `preview_ready -> preview_generated`
  条件：成功生成 `PreviewInput draft`
- `preview_generated -> handoff_ready`
  条件：实验室需要的核心字段已足够
- `handoff_ready -> handoff_completed`
  条件：成功生成 `LabHandoff`
- 任意状态 -> `blocked`
  条件：信息冲突、需求超边界、需人工判断

## 3. 必问问题清单

### 基础定位

- 你想做什么类型的设备？
- 这个设备主要给谁使用？
- 使用场景是什么？

### 核心功能

- 最核心的 3 到 5 个功能是什么？
- 这个设备最重要的交互方式是什么？

### 硬件与交互

- 是否需要屏幕？
- 是否需要按钮、旋钮、触控或语音？
- 是否需要传感器？如果需要，是什么类型？
- 是否需要摄像头、麦克风或扬声器？
- 是否需要无线连接？例如蓝牙、Wi‑Fi、4G、GPS
- 是否需要对外接口？例如 USB、音频口、电源口

### 结构与供电

- 设备大致尺寸或外形有没有约束？
- 是电池供电还是外接供电？
- 是否需要便携、穿戴、防水、抗摔等要求？

### 项目约束

- 预算范围大概是多少？
- 期望时间节点是什么？
- 有没有参考产品、参考图片或已有原型？

## 4. 需求采集字段

建议统一收敛成这些字段：

```ts
type ConfirmedRequirement = {
  device_type?: string;
  use_case?: string;
  target_users?: string;
  core_features?: string[];
  screen?: string;
  controls?: string[];
  sensors?: string[];
  audio?: string[];
  connectivity?: string[];
  ports?: string[];
  power?: string[];
  size?: string;
  budget?: string;
  timeline?: string;
  environment?: string;
  references?: string[];
};
```

## 5. 输出 Schema

### `IntakeAgentOutput`

```ts
type IntakeIntent =
  | "consulting"
  | "prototype"
  | "custom_device"
  | "upgrade"
  | "support";

type IntakeNextAction =
  | "ask_more"
  | "generate_preview"
  | "prepare_handoff"
  | "handoff_to_lab"
  | "handoff_to_human";

type IntakeAgentOutput = {
  state:
    | "collecting"
    | "clarifying"
    | "preview_ready"
    | "preview_generated"
    | "handoff_ready"
    | "handoff_completed"
    | "blocked";
  intent: IntakeIntent;
  requirement_summary: string;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  risks: string[];
  preview_input_draft?: unknown;
  lab_handoff?: LabHandoff;
  next_action: IntakeNextAction;
  customer_reply: string;
};
```

### `LabHandoff`

```ts
type LabHandoff = {
  customer_summary: string;
  project_type: string;
  use_case: string;
  target_users?: string;
  core_features: string[];
  hardware_requirements: {
    screen?: string;
    controls?: string[];
    sensors?: string[];
    audio?: string[];
    connectivity?: string[];
    power?: string[];
    ports?: string[];
  };
  constraints: {
    size?: string;
    budget?: string;
    timeline?: string;
    environment?: string;
  };
  references: string[];
  unknowns: string[];
  risks: string[];
  recommended_next_step: string;
  preview_input_draft?: unknown;
};
```

## 6. 输出原则

每轮建议都产出两层内容：

- 面向客户的自然语言回复
- 面向系统的结构化结果

自然语言回复应：

- 中文优先
- 清楚说明当前理解
- 告知缺失项
- 告知下一步

结构化结果应：

- 稳定字段名
- 不偷填客户没说的信息
- 明确 `unknowns`
- 明确 `next_action`

## 7. v1 通过标准

如果这份规范落地后，系统能做到以下几点，就算 v1 成功：

- 客户需求能稳定进入结构化采集流程
- 关键缺失项不会被跳过
- 输出结果可以直接喂给 preview 和实验室
- 系统能区分继续追问、生成 preview、准备 handoff 这三种下一步
