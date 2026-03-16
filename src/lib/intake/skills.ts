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
  renderReply?: (context: SkillContext) => string | null;
};

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function buildRequirementSummary(confirmed: ConfirmedRequirement) {
  return [
    confirmed.device_type ? `设备类型：${confirmed.device_type}` : undefined,
    confirmed.use_case ? `场景：${confirmed.use_case}` : undefined,
    confirmed.screen ? `屏幕：${confirmed.screen}` : undefined,
    confirmed.controls?.length ? `交互：${confirmed.controls.join("、")}` : undefined,
    confirmed.sensors?.length ? `传感器：${confirmed.sensors.join("、")}` : undefined,
    confirmed.connectivity?.length
      ? `连接：${confirmed.connectivity.join("、")}`
      : undefined,
    confirmed.power?.length ? `供电：${confirmed.power.join("、")}` : undefined,
  ]
    .filter(Boolean)
    .join("；");
}

const RUNTIME_SKILLS: RuntimeSkill[] = [
  {
    id: "capability-intro",
    description: "介绍前台 agent 能做什么。",
    match: ({ message }) =>
      hasPattern(message, [/(你是谁|你能做什么|你会什么|介绍一下你自己)/]),
    renderReply: ({ state }) => {
      const summary = buildRequirementSummary(state.confirmed);
      if (summary) {
        return `我现在主要负责三件事：先和你自然聊清楚需求，再把信息整理成 3D 预览草案，最后生成可交给实验室继续评估的交接单。你当前这边我已经记住的是：${summary}。`;
      }
      return "我现在主要负责三件事：先和你自然聊清楚需求，再把信息整理成 3D 预览草案，最后生成可交给实验室继续评估的交接单。";
    },
  },
  {
    id: "lab-intro",
    description: "介绍实验室定位与接待流程。",
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下实验室|介绍实验室|这个实验室是做什么的)/]),
    renderReply: () =>
      "这个实验室主要做嵌入式产品需求接待、方案梳理和结构预览。我会先和你把产品想法聊清楚，再把信息整理成 3D preview 草案和实验室交接单，方便后面的工程评估继续接。",
  },
  {
    id: "solution-intro",
    description: "介绍当前方案或当前舞台所代表的产品方向。",
    match: ({ message }) =>
      hasPattern(message, [/(介绍一下当前方案|当前方案是什么|这个方案怎么样)/]),
    renderReply: ({ state }) => {
      const summary = buildRequirementSummary(state.confirmed);
      return summary
        ? `当前我理解到的方案是：${summary}。如果你愿意，我可以继续帮你补齐使用场景、核心功能和尺寸约束，这样就能更稳地推进到实验室交接。`
        : "当前还没有形成完整方案，但我们已经可以开始聊。你告诉我想做什么设备、给谁用、主要功能是什么，我就能一步步帮你收成方案。";
    },
  },
  {
    id: "handoff-promoter",
    description: "在交接单可用时负责把对话推进到 handoff 阶段。",
    match: ({ previewDraft, unknowns }) =>
      Boolean(previewDraft) && unknowns.length <= 2,
    useSecondMe: true,
  },
  {
    id: "preview-promoter",
    description: "在预览草案已经可生成时负责把对话推进到 preview 阶段。",
    match: ({ previewDraft }) => Boolean(previewDraft),
    useSecondMe: true,
  },
  {
    id: "requirement-clarifier",
    description: "默认技能，用于自然澄清需求并推进结构化收集。",
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

export function renderSkillReply(skillId: IntakeSkillId, context: SkillContext) {
  const skill = RUNTIME_SKILLS.find((entry) => entry.id === skillId);
  if (!skill?.renderReply) return null;
  return skill.renderReply(context);
}

export function listRuntimeSkills() {
  return RUNTIME_SKILLS.map(({ id, description, useSecondMe }) => ({
    id,
    description,
    useSecondMe: Boolean(useSecondMe),
  }));
}
