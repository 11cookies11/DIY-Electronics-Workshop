import { detectConversationBaseMode } from "./conversation-base";
import type { ConversationMemory } from "./types";
import { parseConversationSignals } from "./signals";
import type { ConfirmedRequirement, IntakeNextAction, IntakeSkillRoute, PreviewDraft } from "./types";

export type ReplyPriority =
  | "connect"
  | "answer_directly"
  | "acknowledge"
  | "offer_suggestion"
  | "ask_single_question"
  | "confirm_preview"
  | "confirm_handoff"
  | "invite_next_step";

export type TransitionMode =
  | "stay_conversational"
  | "answer_then_offer"
  | "soft_clarify"
  | "preview_ready"
  | "handoff_ready";

export type ReplyOrchestration = {
  baseMode: ReturnType<typeof detectConversationBaseMode>;
  transitionMode: TransitionMode;
  priorities: ReplyPriority[];
  shouldAdvanceRequirement: boolean;
  singleFocus?: string;
};

function hasCollectedCore(confirmed: ConfirmedRequirement) {
  return Boolean(
    confirmed.device_type ||
      confirmed.use_case ||
      confirmed.screen ||
      confirmed.controls?.length ||
      confirmed.core_features?.length ||
      confirmed.power?.length,
  );
}

export function planReplyOrchestration(args: {
  message: string;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  nextAction: IntakeNextAction;
  route: IntakeSkillRoute;
  previewDraft?: PreviewDraft;
  memory?: ConversationMemory;
}) {
  const baseMode = detectConversationBaseMode(args.message);
  const signals = parseConversationSignals(args.message);
  const hasCore = hasCollectedCore(args.confirmed);
  const focus = args.memory?.focusHint ?? args.unknowns[0];

  if (baseMode !== "none" && !hasCore) {
    return {
      baseMode,
      transitionMode: "stay_conversational",
      priorities: ["connect", "answer_directly", "invite_next_step"],
      shouldAdvanceRequirement: false,
    } satisfies ReplyOrchestration;
  }

  if (args.route.active_skill === "preview-promoter" && args.previewDraft) {
    return {
      baseMode,
      transitionMode: "preview_ready",
      priorities: ["acknowledge", "confirm_preview", "invite_next_step"],
      shouldAdvanceRequirement: true,
    } satisfies ReplyOrchestration;
  }

  if (args.route.active_skill === "handoff-promoter") {
    return {
      baseMode,
      transitionMode: "handoff_ready",
      priorities: ["acknowledge", "confirm_handoff", "invite_next_step"],
      shouldAdvanceRequirement: true,
    } satisfies ReplyOrchestration;
  }

  if (args.route.active_skill === "capability-intro" || args.route.active_skill === "lab-intro" || args.route.active_skill === "solution-intro") {
    return {
      baseMode,
      transitionMode: "answer_then_offer",
      priorities: ["answer_directly", "invite_next_step"],
      shouldAdvanceRequirement: hasCore,
    } satisfies ReplyOrchestration;
  }

  if (signals.isNegative) {
    return {
      baseMode,
      transitionMode: "stay_conversational",
      priorities: ["acknowledge", "offer_suggestion"],
      shouldAdvanceRequirement: false,
    } satisfies ReplyOrchestration;
  }

  if (args.memory?.mode === "answering_question" || args.memory?.mode === "correcting") {
    return {
      baseMode,
      transitionMode: "soft_clarify",
      priorities: ["acknowledge", "ask_single_question"],
      shouldAdvanceRequirement: true,
      singleFocus: focus,
    } satisfies ReplyOrchestration;
  }

  return {
    baseMode,
    transitionMode: args.previewDraft ? "preview_ready" : "soft_clarify",
    priorities: ["acknowledge", "offer_suggestion", "ask_single_question"],
    shouldAdvanceRequirement: true,
    singleFocus: focus,
  } satisfies ReplyOrchestration;
}
