import type { IntakeAgentRequest } from "./types";
import { buildEmbeddedKnowledgePrompt, buildLabKnowledgePrompt } from "./knowledge";
import {
  FRONT_DESK_FEWSHOTS,
  FRONT_DESK_OUTPUT_RULES,
  FRONT_DESK_PERSONA,
  FRONT_DESK_RUNTIME_RULES,
} from "./prompt-config";

function buildPromptSection(title: string, lines: string[]) {
  return [title, ...lines.map((line) => `- ${line}`)].join("\n");
}

export function buildIntakeSystemPrompt() {
  return [
    buildPromptSection("前台角色", FRONT_DESK_PERSONA),
    buildPromptSection("运行时规则", FRONT_DESK_RUNTIME_RULES),
    buildPromptSection("输出要求", FRONT_DESK_OUTPUT_RULES),
    buildPromptSection("参考风格示例", FRONT_DESK_FEWSHOTS),
    buildEmbeddedKnowledgePrompt(),
    buildLabKnowledgePrompt(),
  ].join("\n\n");
}

export function buildIntakeUserPrompt(request: IntakeAgentRequest) {
  return JSON.stringify(
    {
      locale: request.locale,
      message: request.message,
      current_state: request.state,
      recent_history: request.history?.slice(-6) ?? [],
      instruction:
        "请基于当前会话状态更新结构化需求。先像真人前台一样自然回应，再决定是否推进需求。只有在信息确实足够时，再把 next_action 推进到 generate_preview 或 prepare_handoff。",
    },
    null,
    2,
  );
}

export function buildIntakeReasoningSystemPrompt() {
  return [
    "你是前台 Agent 的结构化理解层。",
    "你的任务不是直接和用户聊天，而是把最新一轮对话理解成尽量小、尽量准的需求补丁。",
    "请优先利用最近历史、当前状态和用户刚说的话，识别新增信息、纠错信息和可明确落表的偏好。",
    "如果用户在纠正旧信息，例如“不是电视，是投影仪”“改成内置电池”，请把对应字段放进 replace_fields。",
    "如果你不确定，就不要猜，不要输出该字段。",
    "只输出 JSON，不要输出解释。",
  ].join("\n");
}

export function buildIntakeReasoningUserPrompt(request: IntakeAgentRequest) {
  return JSON.stringify(
    {
      locale: request.locale,
      latest_user_message: request.message,
      current_confirmed: request.state.confirmed,
      current_unknowns: request.state.unknowns,
      recent_history: request.history?.slice(-8) ?? [],
      output_contract: {
        confirmed_patch: "Partial<ConfirmedRequirement>",
        replace_fields: [
          "device_type",
          "use_case",
          "target_users",
          "target_devices",
          "core_features",
          "screen",
          "screen_size_preference",
          "controls",
          "button_preferences",
          "interaction_layout",
          "sensors",
          "audio",
          "connectivity",
          "ports",
          "power",
          "size",
          "placement",
          "portability",
          "budget",
          "timeline",
          "environment",
          "references",
        ],
        confidence: ["low", "medium", "high"],
      },
      rules: [
        "只提取你有把握的信息。",
        "数组字段只放确认过的条目，不要把模糊候选塞进去。",
        "如果用户是在回答上一轮问题，可以结合上一轮问题补全语义。",
        "如果用户说“这些都要”“保留这些按键”“你来决定吧”，请结合上下文理解。",
        "不要生成 customer_reply，不要复述原文。",
      ],
    },
    null,
    2,
  );
}
