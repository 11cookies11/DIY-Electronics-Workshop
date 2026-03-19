import type {
  ConfirmedRequirement,
  IntakeNextAction,
  LlmNativeDecision,
  LlmNativeSlotAssessment,
} from "./types";

const SLOT_LABEL_ALIASES: Record<string, string> = {
  device_type: "\u8bbe\u5907\u7c7b\u578b",
  "\u8bbe\u5907\u7c7b\u578b": "\u8bbe\u5907\u7c7b\u578b",
  use_case: "\u4f7f\u7528\u573a\u666f",
  "\u4f7f\u7528\u573a\u666f": "\u4f7f\u7528\u573a\u666f",
  target_devices: "\u63a7\u5236\u5bf9\u8c61",
  "\u63a7\u5236\u5bf9\u8c61": "\u63a7\u5236\u5bf9\u8c61",
  core_features: "\u6838\u5fc3\u529f\u80fd",
  "\u6838\u5fc3\u529f\u80fd": "\u6838\u5fc3\u529f\u80fd",
  power: "\u4f9b\u7535\u65b9\u5f0f",
  "\u4f9b\u7535\u65b9\u5f0f": "\u4f9b\u7535\u65b9\u5f0f",
  controls: "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f",
  screen: "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f",
  ports: "\u63a5\u53e3\u9700\u6c42",
  connectivity: "\u8fde\u63a5\u65b9\u5f0f",
  button_preferences: "\u6309\u952e\u6216\u89e6\u5c4f\u4ea4\u4e92",
  interaction_layout: "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f",
  size: "\u5c3a\u5bf8\u4e0e\u5916\u5f62",
  screen_size_preference: "\u5c3a\u5bf8\u4e0e\u5916\u5f62",
  "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f": "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f",
  "\u6309\u952e\u6216\u89e6\u5c4f\u4ea4\u4e92": "\u6309\u952e\u6216\u89e6\u5c4f\u4ea4\u4e92",
  "\u63a5\u53e3\u9700\u6c42": "\u63a5\u53e3\u9700\u6c42",
  "\u8fde\u63a5\u65b9\u5f0f": "\u8fde\u63a5\u65b9\u5f0f",
  "\u5c3a\u5bf8\u4e0e\u5916\u5f62": "\u5c3a\u5bf8\u4e0e\u5916\u5f62",
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
        ? `\u300c${normalized}\u300d\u5b58\u5728\u51b2\u7a81\uff1a${assessment.evidence}`
        : `\u300c${normalized}\u300d\u5b58\u5728\u5f85\u6f84\u6e05\u51b2\u7a81`;
    });
}
