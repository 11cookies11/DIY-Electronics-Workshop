import {
  inferDeviceArchetypeScores,
  pickLeadingArchetype,
  type DeviceArchetype,
} from "./archetypes";
import { detectConversationBaseMode } from "./conversation-base";
import { parseConversationSignals } from "./signals";
import type { ConversationMemory } from "./types";
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
  inferredArchetype?: DeviceArchetype;
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

function hasResolvedFocus(focus: string | undefined, confirmed: ConfirmedRequirement) {
  if (!focus) return false;

  switch (focus) {
    case "设备类型":
      return Boolean(confirmed.device_type);
    case "使用场景":
      return Boolean(confirmed.use_case);
    case "核心功能":
      return Boolean(confirmed.core_features?.length);
    case "控制对象":
      return Boolean(confirmed.target_devices?.length);
    case "供电方式":
      return Boolean(confirmed.power?.length);
    case "主要交互方式":
    case "按键或触屏交互":
      return Boolean(confirmed.screen || confirmed.controls?.length || confirmed.ports?.length);
    case "尺寸与外形":
      return Boolean(confirmed.size || confirmed.screen_size_preference);
    case "接口需求":
      return Boolean(confirmed.ports?.length);
    case "连接方式":
      return Boolean(confirmed.connectivity?.length);
    default:
      return false;
  }
}

function pickSingleFocus(
  message: string,
  confirmed: ConfirmedRequirement,
  unknowns: string[],
  memoryFocus?: string,
) {
  if (memoryFocus && !hasResolvedFocus(memoryFocus, confirmed)) {
    return memoryFocus;
  }

  const preferredOrderByArchetype: Record<DeviceArchetype, string[]> = {
    remote_like: ["控制对象", "主要交互方式", "按键或触屏交互", "供电方式", "使用场景"],
    handheld_like: ["使用场景", "供电方式", "主要交互方式", "核心功能", "尺寸与外形"],
    desktop_like: ["核心功能", "接口需求", "供电方式", "使用场景", "连接方式"],
    wearable_like: ["使用场景", "供电方式", "主要交互方式", "连接方式", "核心功能"],
    speaker_like: ["核心功能", "连接方式", "供电方式", "主要交互方式", "使用场景"],
  };

  const inferredArchetype = pickLeadingArchetype(
    inferDeviceArchetypeScores({ message, confirmed }),
  );
  const preferredOrder = inferredArchetype
    ? preferredOrderByArchetype[inferredArchetype]
    : undefined;

  if (preferredOrder?.length) {
    const preferredFocus = preferredOrder.find((item) => unknowns.includes(item));
    if (preferredFocus) return preferredFocus;
  }

  return unknowns[0];
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
  const inferredArchetype = pickLeadingArchetype(
    inferDeviceArchetypeScores({ message: args.message, confirmed: args.confirmed }),
  );
  const focus = pickSingleFocus(args.message, args.confirmed, args.unknowns, args.memory?.focusHint);
  const focusResolved = hasResolvedFocus(focus, args.confirmed);

  // 重复追问抑制：同一焦点连续追问超过 2 轮时，转为“总结 + 选项式补全”。
  if ((args.memory?.repeatedFocusCount ?? 0) >= 2) {
    return {
      baseMode,
      transitionMode: "answer_then_offer",
      priorities: ["acknowledge", "offer_suggestion", "invite_next_step"],
      shouldAdvanceRequirement: true,
      singleFocus: focus,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (baseMode !== "none" && !hasCore) {
    return {
      baseMode,
      transitionMode: "stay_conversational",
      priorities: ["connect", "answer_directly", "invite_next_step"],
      shouldAdvanceRequirement: false,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (args.memory?.mode === "gratitude") {
    return {
      baseMode,
      transitionMode: "answer_then_offer",
      priorities: ["acknowledge", "invite_next_step"],
      shouldAdvanceRequirement: false,
      singleFocus: focus,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (args.route.active_skill === "preview-promoter" && args.previewDraft) {
    return {
      baseMode,
      transitionMode: "preview_ready",
      priorities: ["acknowledge", "confirm_preview", "invite_next_step"],
      shouldAdvanceRequirement: true,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (args.route.active_skill === "handoff-promoter") {
    return {
      baseMode,
      transitionMode: "handoff_ready",
      priorities: ["acknowledge", "confirm_handoff", "invite_next_step"],
      shouldAdvanceRequirement: true,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (
    args.route.active_skill === "capability-intro" ||
    args.route.active_skill === "lab-intro" ||
    args.route.active_skill === "solution-intro"
  ) {
    return {
      baseMode,
      transitionMode: "answer_then_offer",
      priorities: ["answer_directly", "invite_next_step"],
      shouldAdvanceRequirement: hasCore,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (signals.isNegative) {
    return {
      baseMode,
      transitionMode: "stay_conversational",
      priorities: ["acknowledge", "offer_suggestion"],
      shouldAdvanceRequirement: false,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (
    (args.memory?.mode === "answering_question" ||
      args.memory?.mode === "correcting" ||
      args.memory?.mode === "confirming") &&
    focusResolved &&
    args.previewDraft
  ) {
    return {
      baseMode,
      transitionMode: "preview_ready",
      priorities: ["acknowledge", "offer_suggestion", "invite_next_step"],
      shouldAdvanceRequirement: true,
      singleFocus: focus,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  if (args.memory?.mode === "answering_question" || args.memory?.mode === "correcting") {
    return {
      baseMode,
      transitionMode: "soft_clarify",
      priorities: ["acknowledge", "ask_single_question"],
      shouldAdvanceRequirement: true,
      singleFocus: focus,
      inferredArchetype,
    } satisfies ReplyOrchestration;
  }

  return {
    baseMode,
    transitionMode: args.previewDraft ? "preview_ready" : "soft_clarify",
    priorities: ["acknowledge", "offer_suggestion", "ask_single_question"],
    shouldAdvanceRequirement: true,
    singleFocus: focus,
    inferredArchetype,
  } satisfies ReplyOrchestration;
}
