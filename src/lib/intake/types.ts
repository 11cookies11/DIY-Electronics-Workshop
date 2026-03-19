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

export type IntakeReasoningTrace = {
  enabled: boolean;
  confidence?: "low" | "medium" | "high";
  applied_fields: Array<keyof ConfirmedRequirement>;
  replaced_fields: Array<keyof ConfirmedRequirement>;
  notes: string[];
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
  reasoning_trace?: IntakeReasoningTrace;
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
  preview_candidate?: PreviewDraft;
  handoff_candidate?: LabHandoff;
};

export type IntakeDebugInfo = {
  workflow_state: WorkflowState;
  active_skill: IntakeSkillId;
  matched_skills: IntakeSkillId[];
  routing_reason: string;
  transition_mode: string;
  single_focus?: string;
  inferred_archetype?: string;
  memory_mode: ConversationMemoryMode;
  unknowns: string[];
  risks: string[];
  next_action: IntakeNextAction;
  has_preview_candidate?: boolean;
  has_handoff_candidate?: boolean;
  offering_preview?: boolean;
  offering_handoff?: boolean;
  exposed_preview?: boolean;
  exposed_handoff?: boolean;
  llm_native_stage?: LlmNativeAgentStage;
  llm_native_unknowns?: string[];
  llm_native_single_focus?: string;
  llm_native_next_action?: IntakeNextAction;
  llm_native_preview_ready?: boolean;
  llm_native_handoff_ready?: boolean;
  reasoning_trace?: IntakeReasoningTrace;
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
  | "gratitude"
  | "answering_question"
  | "confirming"
  | "correcting"
  | "rejecting";

export type ConversationMemory = {
  mode: ConversationMemoryMode;
  recentAssistantQuestion?: string;
  pendingUnknown?: string;
  focusHint?: string;
  repeatedFocusCount?: number;
  shouldContinueThread: boolean;
};

export type SecondMeChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type IntakeReasoningPatch = {
  confirmed_patch?: Partial<ConfirmedRequirement>;
  replace_fields?: Array<keyof ConfirmedRequirement>;
  confidence?: "low" | "medium" | "high";
  notes?: string[];
};

export type LlmNativeAgentStage =
  | "free_chat"
  | "intake"
  | "clarify"
  | "preview_offer"
  | "preview_commit"
  | "handoff_offer"
  | "handoff_commit"
  | "blocked";

export type LlmNativeSlotStatus = "unanswered" | "broadly_answered" | "answered" | "conflicted";

export type LlmNativeSlotAssessment = {
  slot: keyof ConfirmedRequirement | string;
  status: LlmNativeSlotStatus;
  evidence?: string;
  confidence?: "low" | "medium" | "high";
};

export type LlmNativeDecision = {
  customer_reply: string;
  agent_stage: LlmNativeAgentStage;
  intent?: IntakeIntent;
  should_store_patch?: boolean;
  confirmed_patch?: Partial<ConfirmedRequirement>;
  replace_fields?: Array<keyof ConfirmedRequirement>;
  slot_assessments: LlmNativeSlotAssessment[];
  unknowns: string[];
  single_focus?: string;
  next_action: IntakeNextAction;
  preview_candidate_ready: boolean;
  handoff_candidate_ready: boolean;
  reasoning_summary?: string;
  assumptions?: string[];
  risks?: string[];
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
