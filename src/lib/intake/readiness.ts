import { evaluateIntakeTransitions } from "./transitions";
import { isLlmFirstModeEnabled } from "./llm-config";
import type {
  IntakeAgentState,
  IntakeNextAction,
  LabHandoff,
  LlmNativeDecision,
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

function resolveByLlmFirst(args: {
  llmDecision?: Pick<
    LlmNativeDecision,
    "agent_stage" | "preview_candidate_ready" | "handoff_candidate_ready" | "next_action"
  >;
  previewDraft?: PreviewDraft;
  labHandoff?: LabHandoff;
}) {
  const stage = args.llmDecision?.agent_stage;
  const next = args.llmDecision?.next_action;
  const canPreview = Boolean(args.previewDraft);
  const canHandoff = canPrepareHandoff(args.labHandoff);

  if (canPreview && (stage === "preview_commit" || next === "generate_preview")) {
    return {
      workflowState: "preview_generated",
      nextAction: "generate_preview",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (canHandoff && (stage === "handoff_commit" || next === "handoff_to_lab" || next === "prepare_handoff")) {
    return {
      workflowState: "handoff_ready",
      nextAction: "prepare_handoff",
      exposePreview: true,
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  if (canPreview && (stage === "preview_offer" || args.llmDecision?.preview_candidate_ready)) {
    return {
      workflowState: "preview_ready",
      nextAction: "ask_more",
      exposePreview: false,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if (canHandoff && (stage === "handoff_offer" || args.llmDecision?.handoff_candidate_ready)) {
    return {
      workflowState: "handoff_ready",
      nextAction: "ask_more",
      exposePreview: canPreview,
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  return undefined;
}

export function decideReadinessFlow(args: {
  message: string;
  previewDraft?: PreviewDraft;
  labHandoff?: LabHandoff;
  state: IntakeAgentState;
  unknowns: string[];
  llmDecision?: Pick<
    LlmNativeDecision,
    "agent_stage" | "preview_candidate_ready" | "handoff_candidate_ready" | "next_action"
  >;
}) {
  if (isLlmFirstModeEnabled() && args.llmDecision) {
    const llmFirst = resolveByLlmFirst(args);
    if (llmFirst) {
      return llmFirst;
    }
  }

  const transitions = evaluateIntakeTransitions({
    message: args.message,
    state: args.state,
    previewDraft: args.previewDraft,
    labHandoff: args.labHandoff,
    unknowns: args.unknowns,
  });
  const llmWantsPreviewOffer =
    Boolean(args.llmDecision?.preview_candidate_ready) &&
    (args.llmDecision?.agent_stage === "preview_offer" ||
      args.llmDecision?.next_action === "generate_preview");
  const llmWantsPreviewCommit =
    Boolean(args.llmDecision?.preview_candidate_ready) &&
    args.llmDecision?.agent_stage === "preview_commit";
  const llmWantsHandoffOffer =
    Boolean(args.llmDecision?.handoff_candidate_ready) &&
    (args.llmDecision?.agent_stage === "handoff_offer" ||
      args.llmDecision?.next_action === "prepare_handoff" ||
      args.llmDecision?.next_action === "handoff_to_lab");
  const llmWantsHandoffCommit =
    Boolean(args.llmDecision?.handoff_candidate_ready) &&
    (args.llmDecision?.agent_stage === "handoff_commit" ||
      args.llmDecision?.next_action === "handoff_to_lab");

  if ((transitions.shouldTriggerPreview || llmWantsPreviewCommit) && args.previewDraft) {
    return {
      workflowState: "preview_generated",
      nextAction: "generate_preview",
      exposePreview: true,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if ((transitions.shouldTriggerHandoff || llmWantsHandoffCommit) && canPrepareHandoff(args.labHandoff)) {
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
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  if ((transitions.shouldOfferPreview || llmWantsPreviewOffer) && args.previewDraft) {
    return {
      workflowState: "preview_ready",
      nextAction: "ask_more",
      exposePreview: false,
      exposeHandoff: false,
    } satisfies ReadinessDecision;
  }

  if ((transitions.shouldOfferHandoff || llmWantsHandoffOffer) && canPrepareHandoff(args.labHandoff)) {
    return {
      workflowState: "handoff_ready",
      nextAction: "ask_more",
      exposePreview: Boolean(args.previewDraft),
      exposeHandoff: true,
    } satisfies ReadinessDecision;
  }

  return {
    workflowState: "clarifying",
    nextAction: "ask_more",
    exposePreview: false,
    exposeHandoff: false,
  } satisfies ReadinessDecision;
}
