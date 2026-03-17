import { parseConversationSignals } from "./signals";
import type {
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
    match: ({ message, state, previewDraft, unknowns }) => {
      const signals = parseConversationSignals(message);
      return (
        Boolean(previewDraft) &&
        unknowns.length <= 2 &&
        !signals.isNegative &&
        (signals.wantsHandoff ||
          (state.workflow_state === "handoff_ready" && signals.isAffirmative))
      );
    },
    useSecondMe: true,
  },
  {
    id: "preview-promoter",
    description: "在预览草案已可生成时把对话推进到 preview 阶段",
    match: ({ message, state, previewDraft }) => {
      const signals = parseConversationSignals(message);
      return (
        Boolean(previewDraft) &&
        !signals.isNegative &&
        (signals.wantsPreview ||
          (state.workflow_state === "preview_ready" && signals.isAffirmative))
      );
    },
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
  const matchedSkills = RUNTIME_SKILLS.filter((skill) => skill.match(context));
  const activeSkill = matchedSkills[0] ?? RUNTIME_SKILLS[RUNTIME_SKILLS.length - 1];

  return {
    active_skill: activeSkill.id,
    matched_skills: matchedSkills.map((skill) => skill.id),
    use_secondme: Boolean(activeSkill.useSecondMe),
  };
}

export function listRuntimeSkills() {
  return RUNTIME_SKILLS.map(({ id, description, useSecondMe }) => ({
    id,
    description,
    useSecondMe: Boolean(useSecondMe),
  }));
}
