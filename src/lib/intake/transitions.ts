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
  const shouldOfferPreview =
    canPreview &&
    !baseSignals.isNegative &&
    args.unknowns.length <= 1;
  const shouldOfferHandoff =
    canHandoff &&
    !baseSignals.isNegative &&
    args.unknowns.length === 0 &&
    (args.state.workflow_state === "preview_generated" || !canPreview);
  const shouldAcceptCurrentPreview =
    args.state.workflow_state === "preview_ready" &&
    !baseSignals.isNegative &&
    (/^(继续|继续吧|就这样|就先这样|先这样|不用补充了|不补充了|直接出吧)$/i.test(
      args.message.trim(),
    ) ||
      /不用(再)?补充|不用再问|直接生成|直接出图|往下走|继续推进/.test(args.message));

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
