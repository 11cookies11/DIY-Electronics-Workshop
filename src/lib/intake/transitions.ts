import { parseConversationSignals } from "./signals";
import type { IntakeAgentState, LabHandoff, PreviewDraft } from "./types";

export type IntakeTransitionSignals = ReturnType<typeof parseConversationSignals> & {
  canPreview: boolean;
  canHandoff: boolean;
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

  const shouldTriggerPreview =
    canPreview &&
    !baseSignals.isNegative &&
    (baseSignals.wantsPreview ||
      (args.state.workflow_state === "preview_ready" && baseSignals.isAffirmative));

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
    shouldTriggerPreview,
    shouldTriggerHandoff,
  } satisfies IntakeTransitionSignals;
}
