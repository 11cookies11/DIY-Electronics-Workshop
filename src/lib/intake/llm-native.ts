import type {
  ConfirmedRequirement,
  IntakeNextAction,
  LlmNativeDecision,
  LlmNativeSlotAssessment,
} from "./types";

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
