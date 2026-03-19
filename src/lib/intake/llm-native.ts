import type {
  ConfirmedRequirement,
  IntakeNextAction,
  LlmNativeDecision,
  LlmNativeSlotAssessment,
} from "./types";

const SLOT_LABEL_ALIASES: Record<string, string> = {
  device_type: "设备类型",
  设备类型: "设备类型",
  use_case: "使用场景",
  使用场景: "使用场景",
  target_devices: "控制对象",
  控制对象: "控制对象",
  core_features: "核心功能",
  核心功能: "核心功能",
  power: "供电方式",
  供电方式: "供电方式",
  controls: "主要交互方式",
  screen: "主要交互方式",
  ports: "接口需求",
  connectivity: "连接方式",
  button_preferences: "按键或触屏交互",
  interaction_layout: "主要交互方式",
  size: "尺寸与外形",
  screen_size_preference: "尺寸与外形",
  主要交互方式: "主要交互方式",
  按键或触屏交互: "按键或触屏交互",
  接口需求: "接口需求",
  连接方式: "连接方式",
  尺寸与外形: "尺寸与外形",
};

function normalizeSlotLabel(slot: string) {
  return SLOT_LABEL_ALIASES[slot] ?? slot;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asConfirmedPatch(value: unknown): Partial<ConfirmedRequirement> | undefined {
  return isObject(value) ? (value as Partial<ConfirmedRequirement>) : undefined;
}

function asSlotAssessments(value: unknown): LlmNativeSlotAssessment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((item) => ({
      slot: typeof item.slot === "string" ? item.slot : "unknown",
      status:
        item.status === "unanswered" ||
        item.status === "broadly_answered" ||
        item.status === "answered" ||
        item.status === "conflicted"
          ? item.status
          : "unanswered",
      evidence: typeof item.evidence === "string" ? item.evidence : undefined,
      confidence:
        item.confidence === "low" || item.confidence === "medium" || item.confidence === "high"
          ? item.confidence
          : undefined,
    }));
}

function asNextAction(value: unknown): IntakeNextAction {
  return value === "generate_preview" ||
    value === "prepare_handoff" ||
    value === "handoff_to_lab" ||
    value === "handoff_to_human"
    ? value
    : "ask_more";
}

export function sanitizeLlmNativeDecision(payload: unknown): LlmNativeDecision | undefined {
  if (!isObject(payload) || typeof payload.customer_reply !== "string") {
    return undefined;
  }

  return {
    customer_reply: payload.customer_reply,
    agent_stage:
      payload.agent_stage === "free_chat" ||
      payload.agent_stage === "intake" ||
      payload.agent_stage === "clarify" ||
      payload.agent_stage === "preview_offer" ||
      payload.agent_stage === "preview_commit" ||
      payload.agent_stage === "handoff_offer" ||
      payload.agent_stage === "handoff_commit" ||
      payload.agent_stage === "blocked"
        ? payload.agent_stage
        : "clarify",
    intent:
      payload.intent === "consulting" ||
      payload.intent === "prototype" ||
      payload.intent === "custom_device" ||
      payload.intent === "upgrade" ||
      payload.intent === "support"
        ? payload.intent
        : undefined,
    should_store_patch: payload.should_store_patch === true,
    confirmed_patch: asConfirmedPatch(payload.confirmed_patch),
    replace_fields: asStringArray(payload.replace_fields) as Array<keyof ConfirmedRequirement>,
    slot_assessments: asSlotAssessments(payload.slot_assessments),
    unknowns: asStringArray(payload.unknowns),
    single_focus: typeof payload.single_focus === "string" ? payload.single_focus : undefined,
    next_action: asNextAction(payload.next_action),
    preview_candidate_ready: payload.preview_candidate_ready === true,
    handoff_candidate_ready: payload.handoff_candidate_ready === true,
    reasoning_summary:
      typeof payload.reasoning_summary === "string" ? payload.reasoning_summary : undefined,
    assumptions: asStringArray(payload.assumptions),
    risks: asStringArray(payload.risks),
  };
}

export function deriveUnknownsFromSlotAssessments(
  baselineUnknowns: string[],
  slotAssessments: LlmNativeSlotAssessment[],
) {
  const unknowns = new Set(baselineUnknowns);

  for (const assessment of slotAssessments) {
    const normalized = normalizeSlotLabel(assessment.slot);
    if (!normalized) continue;

    if (assessment.status === "answered" || assessment.status === "broadly_answered") {
      unknowns.delete(normalized);
      continue;
    }

    if (assessment.status === "unanswered" || assessment.status === "conflicted") {
      unknowns.add(normalized);
    }
  }

  return [...unknowns];
}

export function deriveRisksFromSlotAssessments(slotAssessments: LlmNativeSlotAssessment[]) {
  return slotAssessments
    .filter((assessment) => assessment.status === "conflicted")
    .map((assessment) => {
      const normalized = normalizeSlotLabel(assessment.slot);
      return assessment.evidence
        ? `「${normalized}」存在冲突：${assessment.evidence}`
        : `「${normalized}」存在待澄清冲突`;
    });
}
