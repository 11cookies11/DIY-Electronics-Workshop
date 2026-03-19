import { parseConversationSignals } from "./signals";
import type { IntakeAgentState, LabHandoff, PreviewDraft } from "./types";

export type IntakeTransitionSignals = ReturnType<typeof parseConversationSignals> & {
  canPreview: boolean;
  canHandoff: boolean;
  shouldOfferPreview: boolean;
  shouldOfferHandoff: boolean;
  shouldTriggerPreview: boolean;
  shouldTriggerHandoff: boolean;
};

function normalizeMessage(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function includesAny(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function shouldAcceptPreviewByDirectPhrase(message: string) {
  const normalized = normalizeMessage(message);
  return includesAny(normalized, [
    "我愿意",
    "愿意",
    "可以开始",
    "开始吧",
    "继续",
    "就这样",
    "直接出图",
    "直接生成",
    "不用再问",
    "往下走",
  ]);
}

export function evaluateIntakeTransitions(args: {
  message: string;
  state: IntakeAgentState;
  previewDraft?: PreviewDraft;
  labHandoff?: LabHandoff;
  unknowns: string[];
}) {
  const baseSignals = parseConversationSignals(args.message);
  const canPreview = Boolean(args.previewDraft);
  const canHandoff = Boolean(args.labHandoff) && args.unknowns.length <= 2;
  const shouldOfferPreview = canPreview && !baseSignals.isNegative && args.unknowns.length <= 1;
  const shouldOfferHandoff =
    canHandoff &&
    !baseSignals.isNegative &&
    args.unknowns.length === 0 &&
    (args.state.workflow_state === "preview_generated" || !canPreview);
  const shouldAcceptCurrentPreview =
    args.state.workflow_state === "preview_ready" &&
    !baseSignals.isNegative &&
    (baseSignals.isAffirmative || shouldAcceptPreviewByDirectPhrase(args.message));

  const shouldTriggerPreview =
    shouldOfferPreview &&
    !baseSignals.isNegative &&
    (baseSignals.wantsPreview ||
      (args.state.workflow_state === "preview_ready" && baseSignals.isAffirmative) ||
      shouldAcceptCurrentPreview);

  const shouldTriggerHandoff =
    canHandoff &&
    !baseSignals.isNegative &&
    (baseSignals.wantsHandoff ||
      (args.state.workflow_state === "handoff_ready" && baseSignals.isAffirmative) ||
      (args.state.workflow_state === "preview_generated" && baseSignals.wantsHandoff));

  return {
    ...baseSignals,
    canPreview,
    canHandoff,
    shouldOfferPreview,
    shouldOfferHandoff,
    shouldTriggerPreview,
    shouldTriggerHandoff,
  } satisfies IntakeTransitionSignals;
}
