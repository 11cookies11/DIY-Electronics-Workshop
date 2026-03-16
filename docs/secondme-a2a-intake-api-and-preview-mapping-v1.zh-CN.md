# Second Me A2A Intake Agent API 与 Preview 映射 v1

## 范围

本规范覆盖以下 2 项：

- 定义 `PreviewInput draft` 的生成条件与字段映射
- 设计基于 Second Me API 的请求响应格式与会话数据流

配套文档：

- [secondme-a2a-embedded-intake-agent-v1.zh-CN.md](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/docs/secondme-a2a-embedded-intake-agent-v1.zh-CN.md)
- [secondme-a2a-intake-agent-spec-v1.zh-CN.md](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/docs/secondme-a2a-intake-agent-spec-v1.zh-CN.md)
- [3d-preview-input-and-extension.zh-CN.md](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/docs/3d-preview-input-and-extension.zh-CN.md)

## 1. 什么时候生成 PreviewInput draft

建议在以下条件满足后生成：

- 已知设备大类
- 已知主要交互方式
- 已知是否有屏幕
- 已知主要模块类型
- 已知大致外形或尺寸方向

如果以下任一项完全未知，建议先不要生成：

- 设备类型
- 是否有屏幕
- 是否有按钮/触控/接口
- 是否是便携设备还是桌面设备

## 2. Preview 生成就绪判断

建议增加一个内部判断对象：

```ts
type PreviewReadiness = {
  ready: boolean;
  missing: string[];
  assumptions: string[];
};
```

判断规则：

- `ready = true`
  - 有设备类型
  - 有核心功能
  - 有基础交互
  - 有外形方向
- `ready = false`
  - 缺任意关键输入

## 3. 客户需求到 PreviewInput 的字段映射

### 输入来源

映射来源应来自 `confirmed` 字段：

```ts
type ConfirmedRequirement = {
  device_type?: string;
  core_features?: string[];
  screen?: string;
  controls?: string[];
  sensors?: string[];
  connectivity?: string[];
  ports?: string[];
  power?: string[];
  size?: string;
  references?: string[];
};
```

### 映射原则

- 缺少精确值时允许使用草案默认值
- 所有默认值都应进入 `assumptions`
- 只生成结构草案，不做最终工程定稿

## 4. PreviewInput draft 结构

建议直接复用当前 preview 系统的 `PreviewInput`，但在 Agent 层包一层说明：

```ts
type PreviewDraft = {
  readiness: PreviewReadiness;
  assumptions: string[];
  input: PreviewInput;
};
```

## 5. 推荐映射规则

### `device_type -> shell / shellSize`

示例：

- `智能手表`
  - `shell: "cuboid"`
  - `shellSize: { width: 48, height: 48, depth: 18 }`
- `红外遥控器`
  - `shell: "cuboid"`
  - `shellSize: { width: 46, height: 156, depth: 18 }`
- `桌面设备`
  - `shell: "cuboid"`
  - `shellSize: { width: 92, height: 110, depth: 86 }`

如果客户给了尺寸，以客户为准；否则使用设备模板默认值。

### `screen -> mainScreen`

如果客户明确需要屏幕：

- 默认放 `front`
- 默认类型：
  - 普通屏幕：`display_panel`
  - 强调触控：`touch_display`

### `controls -> ports / shell interactions`

映射建议：

- `按钮`
  - `ports` 中可先使用 `button_cutout`
  - 或在 `modules` 中使用 `button_array`，由系统提升到外壳层
- `旋钮`
  - v1 可先作为外壳交互件待扩展
- `USB-C`
  - `ports[].type = "usb_c"`
- `音频口`
  - `ports[].type = "audio_jack"`

### `sensors / connectivity / power -> modules`

推荐映射：

- `蓝牙` -> `bluetooth`
- `Wi-Fi` -> `wifi`
- `IMU` -> `imu_sensor`
- `摄像头` -> `camera_module`
- `电池供电` -> `battery`
- `PMIC / 充电管理` -> `pmic`

### `core_features -> modules`

如果功能需要主控，默认补：

- `esp32`
- 或 `esp32_s3`

建议默认规则：

- 带屏幕 + 无线 + 传感器的小型设备：默认 `esp32_s3`
- 更轻量设备：默认 `esp32`

## 6. 示例 PreviewInput draft

```ts
{
  readiness: {
    ready: true,
    missing: [],
    assumptions: [
      "未提供精确尺寸，使用智能手表默认外形尺寸",
      "默认屏幕位于前壳"
    ]
  },
  assumptions: [
    "默认使用 ESP32-S3 作为主控"
  ],
  input: {
    shell: "cuboid",
    shellSize: { width: 48, height: 48, depth: 18 },
    board: {
      placement: "center",
      grid: { cols: 5, rows: 4 }
    },
    mainScreen: {
      face: "front",
      type: "display_panel",
      sizeMm: { width: 30, height: 34, depth: 3 }
    },
    ports: [
      { face: "left", type: "button_cutout", sizeMm: { width: 8, height: 8, depth: 4 } }
    ],
    modules: [
      "esp32_s3",
      "battery",
      "bluetooth",
      "imu_sensor"
    ]
  }
}
```

## 7. Second Me API 集成目标

Second Me API 作为底层对话能力层。

业务层需要自己维护：

- 当前会话状态
- 已确认字段
- 缺失字段
- 风险
- preview 草案
- handoff 草案

也就是说：

**Second Me 负责生成，业务服务负责状态与编排。**

## 8. 推荐请求格式

建议服务端调用 Second Me API 时，统一使用一个应用层请求结构：

```ts
type IntakeAgentRequest = {
  session_id: string;
  user_id?: string;
  locale: "zh-CN";
  message: string;
  state: {
    workflow_state:
      | "collecting"
      | "clarifying"
      | "preview_ready"
      | "preview_generated"
      | "handoff_ready"
      | "handoff_completed"
      | "blocked";
    confirmed: Record<string, unknown>;
    unknowns: string[];
    risks: string[];
    assumptions: string[];
    preview_input_draft?: unknown;
    lab_handoff?: unknown;
  };
};
```

## 9. 推荐响应格式

服务端从 Second Me API 拿到回复后，统一归一成：

```ts
type IntakeAgentResponse = {
  customer_reply: string;
  state: {
    workflow_state:
      | "collecting"
      | "clarifying"
      | "preview_ready"
      | "preview_generated"
      | "handoff_ready"
      | "handoff_completed"
      | "blocked";
    confirmed: Record<string, unknown>;
    unknowns: string[];
    risks: string[];
    assumptions: string[];
    preview_input_draft?: unknown;
    lab_handoff?: unknown;
  };
  next_action:
    | "ask_more"
    | "generate_preview"
    | "prepare_handoff"
    | "handoff_to_lab"
    | "handoff_to_human";
};
```

## 10. 推荐会话数据流

### 第一步

前端提交客户消息到你的业务服务。

### 第二步

业务服务读取当前会话状态，并构造 `IntakeAgentRequest`。

### 第三步

业务服务调用 Second Me API。

### 第四步

业务服务解析 Second Me 回复，更新：

- `confirmed`
- `unknowns`
- `risks`
- `workflow_state`
- `next_action`

### 第五步

如果 `next_action === "generate_preview"`：

- 业务服务根据 `confirmed` 生成 `PreviewInput draft`
- 调用当前 preview pipeline
- 将结果写回会话状态

### 第六步

如果 `next_action === "prepare_handoff"`：

- 业务服务构造 `LabHandoff`
- 写回会话状态

## 11. 服务分层建议

建议分成 3 层：

### `conversation layer`

负责：

- 对接 Second Me API
- 返回自然语言回复

### `workflow layer`

负责：

- 状态机
- 字段更新
- preview 触发
- handoff 触发

### `capability layer`

负责：

- 3D preview
- handoff 生成
- 未来 PRD / 报价 / 实验室评估

## 12. v1 的最小闭环

推荐先做这个最小闭环：

1. 接收客户消息
2. 用 Second Me API 输出结构化需求摘要
3. 当信息足够时生成 `PreviewInput draft`
4. 调用当前 3D preview
5. 输出 `LabHandoff`

## 13. 一句话总结

这套设计的核心不是“直接把所有逻辑交给 Second Me”，而是：

**用 Second Me API 做对话生成，用你的业务层做状态编排、preview 触发和实验室交接。**
