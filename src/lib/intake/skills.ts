import { detectConversationBaseMode } from "./conversation-base";
import { analyzeConversationMemory } from "./memory";
import { RUNTIME_SKILL_CONFIGS, type RuntimeSkillConfig } from "./skill-config";
import { evaluateIntakeTransitions } from "./transitions";
import type {
  ConversationMemory,
  ConversationTurn,
  ConfirmedRequirement,
  IntakeAgentState,
  IntakeSkillId,
  IntakeSkillRoute,
  PreviewDraft,
} from "./types";

type SkillContext = {
  message: string;
  state: IntakeAgentState;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  previewDraft?: PreviewDraft;
  history?: ConversationTurn[];
  memory?: ConversationMemory;
};

type RuntimeSkill = {
  config: RuntimeSkillConfig;
  match: (context: SkillContext) => boolean;
};

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

const RUNTIME_SKILLS: RuntimeSkill[] = [
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "capability-intro")!,
    match: ({ message }) =>
      hasPattern(message, [/(你是谁|你是做什么的|你能做什么|你会什么|你可以干什么|你能帮我做什么|你这边能做什么|你这边能帮我做什么|你们这边能帮我做什么|主要能帮我做什么|介绍一下你自己)/]),
  },
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "lab-intro")!,
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下实验室|介绍实验室|这个实验室是做什么的)/]),
  },
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "solution-intro")!,
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下当前方案|当前方案是什么|这个方案怎么样)/]),
  },
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "handoff-promoter")!,
    match: ({ message, state, previewDraft, unknowns }) =>
      evaluateIntakeTransitions({
        message,
        state,
        previewDraft,
        unknowns,
      }).shouldTriggerHandoff,
  },
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "preview-promoter")!,
    match: ({ message, state, previewDraft, unknowns }) =>
      evaluateIntakeTransitions({
        message,
        state,
        previewDraft,
        unknowns,
      }).shouldTriggerPreview,
  },
  {
    config: RUNTIME_SKILL_CONFIGS.find((skill) => skill.id === "requirement-clarifier")!,
    match: () => true,
  },
];

export function routeIntakeSkills(context: SkillContext): IntakeSkillRoute {
  const transitions = evaluateIntakeTransitions({
    message: context.message,
    state: context.state,
    previewDraft: context.previewDraft,
    unknowns: context.unknowns,
  });
  const baseMode = detectConversationBaseMode(context.message);
  const memory =
    context.memory ??
    analyzeConversationMemory({
      message: context.message,
      history: context.history,
      unknowns: context.unknowns,
    });
  const hasCollectedIntent = Boolean(
    context.confirmed.device_type ||
      context.confirmed.use_case ||
      context.confirmed.screen ||
      context.confirmed.controls?.length ||
      context.confirmed.core_features?.length ||
      context.confirmed.power?.length,
  );
  const matchedSkills = RUNTIME_SKILLS.filter((skill) => skill.match(context));

  let activeSkill = matchedSkills[0] ?? RUNTIME_SKILLS[RUNTIME_SKILLS.length - 1];
  let reason = "按默认需求澄清路由";

  if (transitions.shouldTriggerHandoff) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "handoff-promoter") ?? activeSkill;
    reason = "当前已有可交接草案，且用户明确要推进到实验室交接";
  } else if (transitions.shouldTriggerPreview) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "preview-promoter") ?? activeSkill;
    reason = "当前已有预览草案，且用户明确确认生成预览";
  } else if (baseMode === "capability" && !hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "capability-intro") ?? activeSkill;
    reason = "当前更适合先介绍前台能力";
  } else if (baseMode === "lab_intro" && !hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "lab-intro") ?? activeSkill;
    reason = "当前更适合先介绍实验室";
  } else if (memory.mode === "correcting") {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "requirement-clarifier") ?? activeSkill;
    reason = "用户正在纠正上一轮信息，需要沿原线程更新需求";
  } else if (memory.mode === "confirming" && !hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "requirement-clarifier") ?? activeSkill;
    reason = "用户正在顺着上一轮问题做确认，需要继续澄清需求";
  } else if (memory.mode === "answering_question") {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "requirement-clarifier") ?? activeSkill;
    reason = "用户正在回答上一轮问题，需要延续当前需求线程";
  } else if (baseMode === "none" && hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.config.id === "requirement-clarifier") ?? activeSkill;
    reason = "当前消息已经进入设备需求层，继续做澄清编排";
  }

  return {
    active_skill: activeSkill.config.id,
    matched_skills: matchedSkills.map((skill) => skill.config.id),
    use_secondme: Boolean(activeSkill.config.useSecondMe),
    reason,
  };
}

export function listRuntimeSkills() {
  return RUNTIME_SKILLS.map(({ config }) => ({
    id: config.id,
    description: config.description,
    triggerHints: config.triggerHints,
    useSecondMe: Boolean(config.useSecondMe),
  }));
}
