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

function wantsPreview(message: string) {
  return hasPattern(message, [
    /(生成|出一版|来一版|搭一版|做一版).*(预览|草案|方案|模型|3d)/i,
    /(看看|看下|想看).*(预览|草案|方案|模型|3d)/i,
    /(直接|现在).*(生成|出).*(预览|草案|方案|模型|3d)/i,
  ]);
}

function wantsHandoff(message: string) {
  return hasPattern(message, [
    /(交接|交给实验室|整理交接单|提交实验室)/,
    /(继续推进|往下走|开始评估).*(实验室|交接)/,
  ]);
}

function isAffirmative(message: string) {
  return hasPattern(message, [
    /^(可以|好|好的|好呀|好啊|行|行啊|来吧|开始吧|继续吧|就这样吧|没问题|可以的|那就这样|那就开始吧)[！。呀啊吧啦嘛？?]*$/i,
    /(那就|那你就|那麻烦你).*(开始|继续|生成|整理|推进)/,
  ]);
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
      Boolean(previewDraft) &&
      unknowns.length <= 2 &&
      (wantsHandoff(message) ||
        (state.workflow_state === "handoff_ready" && isAffirmative(message))),
    useSecondMe: true,
  },
  {
    id: "preview-promoter",
    description: "在预览草案已可生成时把对话推进到 preview 阶段",
    match: ({ message, state, previewDraft }) =>
      Boolean(previewDraft) &&
      (wantsPreview(message) ||
        (state.workflow_state === "preview_ready" && isAffirmative(message))),
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
