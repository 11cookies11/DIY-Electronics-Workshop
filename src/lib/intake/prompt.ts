import type { LlmNativeDecision, IntakeAgentRequest } from "./types";
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

export function buildLlmNativeDecisionSystemPrompt() {
  return [
    "你是一个 LLM-native 的前台接待 Agent 决策层。",
    "你的任务不是只补字段，而是判断当前对话所处阶段、哪些信息已经被回答、下一步该怎么推进。",
    "你要同时输出两部分：给用户看的自然回复，以及给程序执行的结构化决策。",
    "允许把用户的模糊表达归一化成上位概念，例如“覆盖全面一点”可以理解为“常用家电范围”。",
    "如果用户已经用粗粒度表达回答了某个槽位，就不要把它继续视为完全未回答。",
    "程序稍后会校验 preview 和 handoff 的执行条件，所以你可以先做语义判断，但不要伪造已经执行的结果。",
    "只输出 JSON，不要输出解释。",
  ].join("\n");
}

export function buildLlmNativeDecisionUserPrompt(args: {
  request: IntakeAgentRequest;
  confirmed: unknown;
  unknowns: string[];
  previewCandidateReady: boolean;
  handoffCandidateReady: boolean;
  reasoningSummary?: string;
  risks: string[];
}) {
  const outputContract: Record<keyof LlmNativeDecision, unknown> = {
    customer_reply: "string",
    agent_stage: [
      "free_chat",
      "intake",
      "clarify",
      "preview_offer",
      "preview_commit",
      "handoff_offer",
      "handoff_commit",
      "blocked",
    ],
    intent: ["consulting", "prototype", "custom_device", "upgrade", "support"],
    should_store_patch: "boolean",
    confirmed_patch: "Partial<ConfirmedRequirement>",
    replace_fields: ["Array<keyof ConfirmedRequirement>"],
    slot_assessments: [
      {
        slot: "string",
        status: ["unanswered", "broadly_answered", "answered", "conflicted"],
        evidence: "string",
        confidence: ["low", "medium", "high"],
      },
    ],
    unknowns: ["string"],
    single_focus: "string",
    next_action: [
      "ask_more",
      "generate_preview",
      "prepare_handoff",
      "handoff_to_lab",
      "handoff_to_human",
    ],
    preview_candidate_ready: "boolean",
    handoff_candidate_ready: "boolean",
    reasoning_summary: "string",
    assumptions: ["string"],
    risks: ["string"],
  };

  return JSON.stringify(
    {
      locale: args.request.locale,
      latest_user_message: args.request.message,
      current_state: args.request.state,
      current_confirmed: args.confirmed,
      baseline_unknowns: args.unknowns,
      recent_history: args.request.history?.slice(-8) ?? [],
      preview_candidate_ready: args.previewCandidateReady,
      handoff_candidate_ready: args.handoffCandidateReady,
      reasoning_summary: args.reasoningSummary,
      current_risks: args.risks,
      output_contract: outputContract,
      rules: [
        "先判断用户这句话是在闲聊、补充、纠正、确认、拒绝、还是推进下一步。",
        "unknowns 要体现语义判断，不要只按字段缺失机械返回。",
        "slot_assessments 要优先覆盖 baseline_unknowns，至少说明当前关键槽位是 unanswered、broadly_answered、answered 还是 conflicted。",
        "如果用户已经用上位概念回答了问题，例如“家里常用家电都想带上”，对应槽位可以标为 broadly_answered。",
        "single_focus 只保留当前最值得追问的一个点；如果不该追问，可以留空。",
        "如果 preview_candidate_ready 为 true 且用户在推进方案，可以把 next_action 设为 generate_preview。",
        "如果 handoff_candidate_ready 为 true 且用户在推进交接，可以把 next_action 设为 prepare_handoff。",
        "customer_reply 要自然，不要提 JSON 字段名。",
      ],
    },
    null,
    2,
  );
}
