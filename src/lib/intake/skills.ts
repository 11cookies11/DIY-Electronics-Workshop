import { detectConversationBaseMode } from "./conversation-base";
import { evaluateIntakeTransitions } from "./transitions";
import type {
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
};

type RuntimeSkill = {
  id: IntakeSkillId;
  description: string;
  match: (context: SkillContext) => boolean;
  useSecondMe?: boolean;
};

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

const RUNTIME_SKILLS: RuntimeSkill[] = [
  {
    id: "capability-intro",
    description: "介绍前台 agent 能做什么",
    match: ({ message }) =>
      hasPattern(message, [/(你是谁|你能做什么|你会什么|介绍一下你自己)/]),
  },
  {
    id: "lab-intro",
    description: "介绍实验室定位与接待流程",
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下实验室|介绍实验室|这个实验室是做什么的)/]),
  },
  {
    id: "solution-intro",
    description: "介绍当前方案或当前舞台所代表的产品方向",
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下当前方案|当前方案是什么|这个方案怎么样)/]),
  },
  {
    id: "handoff-promoter",
    description: "在交接单可用时把对话推进到 handoff 阶段",
    match: ({ message, state, previewDraft, unknowns }) =>
      evaluateIntakeTransitions({
        message,
        state,
        previewDraft,
        unknowns,
      }).shouldTriggerHandoff,
    useSecondMe: true,
  },
  {
    id: "preview-promoter",
    description: "在预览草案已可生成时把对话推进到 preview 阶段",
    match: ({ message, state, previewDraft }) =>
      evaluateIntakeTransitions({
        message,
        state,
        previewDraft,
        unknowns: [],
      }).shouldTriggerPreview,
    useSecondMe: true,
  },
  {
    id: "requirement-clarifier",
    description: "默认技能，用于自然澄清需求并推进结构化收集",
    match: () => true,
    useSecondMe: true,
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
  const hasCollectedIntent = Boolean(
    context.confirmed.device_type ||
      context.confirmed.use_case ||
      context.confirmed.screen ||
      context.confirmed.controls?.length ||
      context.confirmed.core_features?.length ||
      context.confirmed.power?.length,
  );
  const recentAssistantAsked = context.history?.slice(-2).some(
    (turn) => turn.role === "assistant" && /？|\?/.test(turn.content),
  );
  const matchedSkills = RUNTIME_SKILLS.filter((skill) => skill.match(context));

  let activeSkill = matchedSkills[0] ?? RUNTIME_SKILLS[RUNTIME_SKILLS.length - 1];
  let reason = "按默认需求澄清路由";

  if (transitions.shouldTriggerHandoff) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "handoff-promoter") ?? activeSkill;
    reason = "当前已有可交接草案，且用户明确要推进到实验室交接";
  } else if (transitions.shouldTriggerPreview) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "preview-promoter") ?? activeSkill;
    reason = "当前已有预览草案，且用户明确确认生成预览";
  } else if (baseMode === "capability" && !hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "capability-intro") ?? activeSkill;
    reason = "当前更适合先介绍前台能力";
  } else if (baseMode === "lab_intro" && !hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "lab-intro") ?? activeSkill;
    reason = "当前更适合先介绍实验室";
  } else if (
    baseMode === "none" &&
    !hasCollectedIntent &&
    recentAssistantAsked &&
    transitions.isAffirmative
  ) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "requirement-clarifier") ?? activeSkill;
    reason = "用户正在顺着上一轮追问继续确认需求";
  } else if (baseMode === "none" && hasCollectedIntent) {
    activeSkill = RUNTIME_SKILLS.find((skill) => skill.id === "requirement-clarifier") ?? activeSkill;
    reason = "当前消息已经进入设备需求层，继续做澄清编排";
  }

  return {
    active_skill: activeSkill.id,
    matched_skills: matchedSkills.map((skill) => skill.id),
    use_secondme: Boolean(activeSkill.useSecondMe),
    reason,
  };
}

export function listRuntimeSkills() {
  return RUNTIME_SKILLS.map(({ id, description, useSecondMe }) => ({
    id,
    description,
    useSecondMe: Boolean(useSecondMe),
  }));
}
