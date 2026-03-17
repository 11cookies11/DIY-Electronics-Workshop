import { parseConversationSignals } from "./signals";
import type {
  IntakeAgentState,
  IntakeNextAction,
  LabHandoff,
  PreviewDraft,
} from "./types";

export type ReadinessDecision = {
  workflowState: IntakeAgentState["workflow_state"];
  nextAction: IntakeNextAction;
  exposePreview: boolean;
  exposeHandoff: boolean;
};

function canPrepareHandoff(labHandoff?: LabHandoff) {
  return Boolean(labHandoff);
}

export function decideReadinessFlow(args: {
  message: string;
  previewDraft?: PreviewDraft;
  labHandoff?: LabHandoff;
  previousWorkflowState: IntakeAgentState["workflow_state"];
  activeSkill: string;
  unknowns: string[];
}) {
  const signals = parseConversationSignals(args.message);

  if (args.activeSkill === "preview-promoter" && args.previewDraft && !signals.isNegative) {
    return {
      workflowState: "preview_generated",
      nextAction: "generate_preview",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (args.activeSkill === "handoff-promoter" && canPrepareHandoff(args.labHandoff) && !signals.isNegative) {
    return {
      workflowState: "handoff_ready",
      nextAction: "prepare_handoff",
      exposePreview: true,
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  if (args.previousWorkflowState === "preview_generated" && canPrepareHandoff(args.labHandoff) && args.unknowns.length <= 2) {
    return {
      workflowState: "handoff_ready",
      nextAction: "ask_more",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (args.previewDraft) {
    return {
      workflowState: "preview_ready",
      nextAction: "ask_more",
      exposePreview: false,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  return {
    workflowState: "clarifying",
    nextAction: "ask_more",
    exposePreview: false,
    exposeHandoff: false,
  } satisfies ReadinessDecision;
}
