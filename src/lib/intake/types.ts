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
  target_devices?: string[];
  core_features?: string[];
  screen?: string;
  screen_size_preference?: string;
  controls?: string[];
  button_preferences?: string[];
  interaction_layout?: string;
  sensors?: string[];
  audio?: string[];
  connectivity?: string[];
  ports?: string[];
  power?: string[];
  size?: string;
  placement?: string;
  portability?: string;
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
  target_devices?: string[];
  core_features: string[];
  hardware_requirements: {
    screen?: string;
    screen_size_preference?: string;
    controls?: string[];
    button_preferences?: string[];
    interaction_layout?: string;
    sensors?: string[];
    audio?: string[];
    connectivity?: string[];
    power?: string[];
    ports?: string[];
  };
  constraints: {
    size?: string;
    placement?: string;
    portability?: string;
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

export type IntakeDebugInfo = {
  workflow_state: WorkflowState;
  active_skill: IntakeSkillId;
  matched_skills: IntakeSkillId[];
  routing_reason: string;
  transition_mode: string;
  single_focus?: string;
  memory_mode: ConversationMemoryMode;
  unknowns: string[];
  risks: string[];
  next_action: IntakeNextAction;
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
  debug?: IntakeDebugInfo;
};

export type IntakeStructuredOutput = Omit<IntakeAgentOutput, "customer_reply">;

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

export type ConversationMemoryMode =
  | "new_topic"
  | "free_chat"
  | "answering_question"
  | "confirming"
  | "correcting"
  | "rejecting";

export type ConversationMemory = {
  mode: ConversationMemoryMode;
  recentAssistantQuestion?: string;
  pendingUnknown?: string;
  focusHint?: string;
  shouldContinueThread: boolean;
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
  reason: string;
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
