import type {
  ConfirmedRequirement,
  IntakeDebugInfo,
  IntakeAgentState,
  IntakeIntent,
  IntakeNextAction,
  IntakeStructuredOutput,
  IntakeSuggestion,
  LabHandoff,
  PreviewDraft,
} from "./types";

export function buildStructuredIntakeOutput(args: {
  workflowState: IntakeAgentState["workflow_state"];
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  risks: string[];
  suggestions: IntakeSuggestion[];
  assumptions: string[];
  previewCandidate?: PreviewDraft;
  handoffCandidate?: LabHandoff;
  exposedPreviewDraft?: PreviewDraft;
  exposedLabHandoff?: LabHandoff;
  requirementSummary: string;
  intent: IntakeIntent;
  nextAction: IntakeNextAction;
  debug?: IntakeDebugInfo;
}): IntakeStructuredOutput {
  return {
    state: {
      workflow_state: args.workflowState,
      confirmed: args.confirmed,
      unknowns: args.unknowns,
      risks: args.risks,
      suggestions: args.suggestions,
      assumptions: args.assumptions,
      preview_candidate: args.previewCandidate,
      handoff_candidate: args.handoffCandidate,
    },
    intent: args.intent,
    requirement_summary: args.requirementSummary,
    confirmed: args.confirmed,
    unknowns: args.unknowns,
    risks: args.risks,
    suggestions: args.suggestions,
    preview_input_draft: args.exposedPreviewDraft,
    lab_handoff: args.exposedLabHandoff,
    next_action: args.nextAction,
    debug: args.debug,
  };
}
