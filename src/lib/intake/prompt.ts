import type { IntakeAgentRequest } from "./types";

export function buildIntakeSystemPrompt() {
  return [
    "你是一个面向客户的嵌入式项目需求接待 Agent。",
    "你的职责是把客户的模糊需求整理成可用于 3D 预览和实验室评估的结构化输入。",
    "你优先使用中文交流，表达清晰、专业、克制。",
    "不要承诺最终成本、交期或最终技术选型。",
    "不确定时要把内容放入 unknowns，不要擅自补全。",
    "允许给出草案假设，但必须写入 assumptions。",
    "输出必须是 JSON 对象，不要输出 markdown。",
    "输出字段必须包含：customer_reply、state、intent、requirement_summary、confirmed、unknowns、risks、next_action。",
  ].join("\n");
}

export function buildIntakeUserPrompt(request: IntakeAgentRequest) {
  return JSON.stringify(
    {
      message: request.message,
      locale: request.locale,
      current_state: request.state,
      instruction:
        "基于当前会话状态更新结构化需求。如果信息不足，请继续追问关键缺失项；如果信息足够，请把 next_action 设为 generate_preview 或 prepare_handoff。",
    },
    null,
    2,
  );
}
