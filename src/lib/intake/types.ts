import type { PreviewInput } from "@/engine/preview/types";

export type WorkflowState =
  | "collecting"
  | "clarifying"
  | "preview_ready"
  | "preview_generated"
  | "handoff_ready"
  | "handoff_completed"
  | "blocked";

export type IntakeIntent =
  | "consulting"
  | "prototype"
  | "custom_device"
  | "upgrade"
  | "support";

export type IntakeNextAction =
  | "ask_more"
  | "generate_preview"
  | "prepare_handoff"
  | "handoff_to_lab"
  | "handoff_to_human";

export type ConfirmedRequirement = {
  device_type?: string;
  use_case?: string;
  target_users?: string;
  core_features?: string[];
  screen?: string;
  controls?: string[];
  sensors?: string[];
  audio?: string[];
  connectivity?: string[];
  ports?: string[];
  power?: string[];
  size?: string;
  budget?: string;
  timeline?: string;
  environment?: string;
  references?: string[];
};

export type PreviewReadiness = {
  ready: boolean;
  missing: string[];
  assumptions: string[];
};

export type PreviewDraft = {
  readiness: PreviewReadiness;
  assumptions: string[];
  input: PreviewInput;
};

export type IntakeSuggestion = {
  id: string;
  category: "interaction" | "power" | "connectivity" | "sensor" | "structure" | "module";
  title: string;
  detail: string;
  reason: string;
};

export type LabHandoff = {
  customer_summary: string;
  project_type: string;
  use_case: string;
  target_users?: string;
  core_features: string[];
  hardware_requirements: {
    screen?: string;
    controls?: string[];
    sensors?: string[];
    audio?: string[];
    connectivity?: string[];
    power?: string[];
    ports?: string[];
  };
  constraints: {
    size?: string;
    budget?: string;
    timeline?: string;
    environment?: string;
  };
  references: string[];
  unknowns: string[];
  risks: string[];
  recommended_next_step: string;
  preview_input_draft?: PreviewDraft;
};

export type IntakeAgentState = {
  workflow_state: WorkflowState;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  risks: string[];
  suggestions: IntakeSuggestion[];
  assumptions: string[];
  preview_input_draft?: PreviewDraft;
  lab_handoff?: LabHandoff;
};

export type IntakeAgentOutput = {
  customer_reply: string;
  state: IntakeAgentState;
  intent: IntakeIntent;
  requirement_summary: string;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  risks: string[];
  suggestions: IntakeSuggestion[];
  preview_input_draft?: PreviewDraft;
  lab_handoff?: LabHandoff;
  next_action: IntakeNextAction;
};

export type IntakeAgentRequest = {
  session_id: string;
  user_id?: string;
  locale: "zh-CN";
  message: string;
  state: IntakeAgentState;
  history?: ConversationTurn[];
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type SecondMeChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type IntakeSkillId =
  | "capability-intro"
  | "lab-intro"
  | "solution-intro"
  | "requirement-clarifier"
  | "preview-promoter"
  | "handoff-promoter";

export type IntakeSkillRoute = {
  active_skill: IntakeSkillId;
  matched_skills: IntakeSkillId[];
  use_secondme: boolean;
};

export function createEmptyState(): IntakeAgentState {
  return {
    workflow_state: "collecting",
    confirmed: {},
    unknowns: [],
    risks: [],
    suggestions: [],
    assumptions: [],
  };
}
