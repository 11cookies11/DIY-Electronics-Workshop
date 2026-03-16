# Second Me A2A Intake Agent 运行层设计 v1

## 范围

本规范覆盖以下 3 项：

- 编写 Agent system prompt 与输出约束
- 设计 Agent 与 3D Preview pipeline 的调用接口
- 设计 Agent 与实验室交接流程的接口边界

## 1. System Prompt 设计

### 角色定义

建议 system prompt 里的角色定义为：

> 你是一个面向客户的嵌入式项目需求接待 Agent。  
> 你的职责是把客户的模糊需求整理成可用于 3D 预览和实验室评估的结构化输入。  
> 你优先用中文交流，表达清晰、专业、克制。  
> 你不会直接承诺成本、交期或最终技术方案。  
> 当信息足够时，你会生成设备草案与 preview 输入；当信息不足时，你会继续追问关键缺口。  

### 行为约束

system prompt 里建议明确：

- 不杜撰客户未提供的信息
- 允许基于常识给出草案假设，但必须显式写入 `assumptions`
- 对不确定项进入 `unknowns`
- 对高风险项进入 `risks`
- 不直接输出最终器件选型结论
- 不直接承诺报价和排期

### 对话风格

- 中文优先
- 用语自然，不要机械问卷感过重
- 每轮优先问最关键的 1 到 3 个缺口
- 如果已经足够生成 preview，先给草案再补问

## 2. 输出约束

建议统一要求模型输出两层结果：

### 层 1：客户可见回复

字段：

- `customer_reply`

要求：

- 一段自然语言
- 说明当前理解
- 说明还缺什么或下一步做什么

### 层 2：结构化对象

字段：

- `state`
- `intent`
- `confirmed`
- `unknowns`
- `risks`
- `assumptions`
- `next_action`
- 可选 `preview_input_draft`
- 可选 `lab_handoff`

### 建议约束

- 字段名固定
- 空字段用空数组或省略
- 不要把面向客户的话混进 schema

## 3. 推荐输出模板

```ts
type AgentRuntimeOutput = {
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
  intent: "consulting" | "prototype" | "custom_device" | "upgrade" | "support";
  next_action:
    | "ask_more"
    | "generate_preview"
    | "prepare_handoff"
    | "handoff_to_lab"
    | "handoff_to_human";
};
```

## 4. 3D Preview pipeline 调用接口

### 设计原则

- Agent 不直接生成 3D 几何
- Agent 只负责生成 `PreviewInput draft`
- 业务服务负责调用 preview pipeline

### 推荐接口

```ts
type PreviewGenerationRequest = {
  session_id: string;
  source: "intake-agent";
  preview_input_draft: unknown;
};

type PreviewGenerationResponse = {
  success: boolean;
  preview_input: unknown;
  scene_summary?: {
    shell: string;
    module_count: number;
    port_count: number;
    screen: boolean;
  };
  issues?: string[];
};
```

### 调用时机

仅在 `next_action === "generate_preview"` 时调用。

### 返回后写回的状态

- `state.preview_input_draft`
- `state.workflow_state = "preview_generated"`
- 如果有问题，写入 `risks` 或 `unknowns`

## 5. Preview pipeline 的边界

preview pipeline 负责：

- 把 `PreviewInput` 转成 3D scene
- 自动布局
- assembled / exploded 预览

preview pipeline 不负责：

- 和客户沟通
- 决定问什么问题
- 生成实验室交接单

## 6. 实验室交接接口

### 设计原则

- handoff 是实验室的输入，不是客户对话副本
- 只保留实验室真正要用的信息
- 缺失项和风险必须显式列出

### 推荐接口

```ts
type LabHandoffRequest = {
  session_id: string;
  source: "intake-agent";
  handoff: {
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
};

type LabHandoffResponse = {
  accepted: boolean;
  handoff_id?: string;
  notes?: string[];
};
```

### 调用时机

仅在：

- `next_action === "handoff_to_lab"`
- 或 `next_action === "prepare_handoff"` 且字段已足够

### handoff 前必须具备的信息

- 项目类型
- 使用场景
- 核心功能
- 至少一部分硬件需求
- 未确认项
- 风险

## 7. 实验室接口边界

实验室接口负责：

- 接收结构化交接单
- 进入人工评估或下游实验室 Agent

实验室接口不负责：

- 回头和客户多轮澄清
- 自己猜客户需求
- 自己生成 preview 草案

## 8. 推荐服务编排

建议后端编排如下：

1. 收客户消息
2. 调用 Second Me API
3. 解析结构化结果
4. 若 `generate_preview`，调用 preview pipeline
5. 若 `prepare_handoff` / `handoff_to_lab`，调用 handoff 服务
6. 返回客户可见回复

## 9. 推荐错误处理

### prompt 输出不完整

- 回退为 `ask_more`
- 保留当前已确认字段

### preview 生成失败

- 将问题写入 `risks`
- `next_action` 回退为 `ask_more` 或 `prepare_handoff`

### handoff 校验失败

- 将缺失字段写入 `unknowns`
- 状态退回 `clarifying` 或 `handoff_ready`

## 10. 一句话总结

运行层最重要的原则是：

**Second Me API 负责生成语言和结构化建议，业务服务负责状态编排、preview 调用和实验室交接。**
