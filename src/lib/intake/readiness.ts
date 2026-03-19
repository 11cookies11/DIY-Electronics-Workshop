import { evaluateIntakeTransitions } from "./transitions";
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
  state: IntakeAgentState;
  unknowns: string[];
}) {
  const transitions = evaluateIntakeTransitions({
    message: args.message,
    state: args.state,
    previewDraft: args.previewDraft,
    labHandoff: args.labHandoff,
    unknowns: args.unknowns,
  });

  if (transitions.shouldTriggerPreview && args.previewDraft) {
    return {
      workflowState: "preview_generated",
      nextAction: "generate_preview",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (transitions.shouldTriggerHandoff && canPrepareHandoff(args.labHandoff)) {
    return {
      workflowState: "handoff_ready",
      nextAction: "prepare_handoff",
      exposePreview: true,
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  if (
    args.state.workflow_state === "preview_generated" &&
    canPrepareHandoff(args.labHandoff) &&
    args.unknowns.length <= 2
  ) {
    return {
      workflowState: "handoff_ready",
      nextAction: "ask_more",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (transitions.shouldOfferPreview && args.previewDraft) {
    return {
      workflowState: "preview_ready",
      nextAction: "ask_more",
      exposePreview: false,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (transitions.shouldOfferHandoff && canPrepareHandoff(args.labHandoff)) {
    return {
      workflowState: "handoff_ready",
      nextAction: "ask_more",
      exposePreview: Boolean(args.previewDraft),
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
