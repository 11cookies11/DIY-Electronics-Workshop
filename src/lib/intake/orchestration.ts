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

function hasResolvedFocus(
  focus: string | undefined,
  confirmed: ConfirmedRequirement,
) {
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
  confirmed: ConfirmedRequirement,
  unknowns: string[],
  memoryFocus?: string,
) {
  if (memoryFocus && !hasResolvedFocus(memoryFocus, confirmed)) {
    return memoryFocus;
  }

  const preferredOrderByDeviceType: Partial<Record<string, string[]>> = {
    红外遥控器: ["控制对象", "主要交互方式", "按键或触屏交互", "供电方式", "使用场景"],
    手持设备: ["使用场景", "供电方式", "主要交互方式", "核心功能", "尺寸与外形"],
    桌面设备: ["核心功能", "接口需求", "供电方式", "使用场景", "连接方式"],
    智能手表: ["使用场景", "供电方式", "主要交互方式", "连接方式", "核心功能"],
    蓝牙音箱: ["核心功能", "连接方式", "供电方式", "主要交互方式", "使用场景"],
  };

  const preferredOrder = confirmed.device_type
    ? preferredOrderByDeviceType[confirmed.device_type]
    : undefined;

  if (preferredOrder?.length) {
    const preferredFocus = preferredOrder.find((item) => unknowns.includes(item));
    if (preferredFocus) {
      return preferredFocus;
    }
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
  const focus = pickSingleFocus(
    args.confirmed,
    args.unknowns,
    args.memory?.focusHint,
  );
  const focusResolved = hasResolvedFocus(focus, args.confirmed);

  if (baseMode !== "none" && !hasCore) {
    return {
      baseMode,
      transitionMode: "stay_conversational",
      priorities: ["connect", "answer_directly", "invite_next_step"],
      shouldAdvanceRequirement: false,
    } satisfies ReplyOrchestration;
  }

  if (args.memory?.mode === "gratitude") {
    return {
      baseMode,
      transitionMode: "answer_then_offer",
      priorities: ["acknowledge", "invite_next_step"],
      shouldAdvanceRequirement: false,
      singleFocus: focus,
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
