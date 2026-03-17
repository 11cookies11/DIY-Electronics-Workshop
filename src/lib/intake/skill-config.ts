import type { IntakeSkillId } from "./types";

export type RuntimeSkillConfig = {
  id: IntakeSkillId;
  description: string;
  useSecondMe?: boolean;
  triggerHints: string[];
};

export const RUNTIME_SKILL_CONFIGS: RuntimeSkillConfig[] = [
  {
    id: "capability-intro",
    description: "介绍前台 agent 能做什么",
    triggerHints: ["用户在问你是谁", "用户在问你能做什么", "用户在要求自我介绍"],
  },
  {
    id: "lab-intro",
    description: "介绍实验室定位与接待流程",
    triggerHints: ["用户在询问实验室定位", "用户想了解实验室在做什么"],
  },
  {
    id: "solution-intro",
    description: "介绍当前方案或当前舞台代表的产品方向",
    triggerHints: ["用户在询问当前方案", "用户想了解当前展示的设备方向"],
  },
  {
    id: "requirement-clarifier",
    description: "自然澄清需求并推进结构化收集",
    useSecondMe: true,
    triggerHints: ["用户正在描述设备", "用户在补充上一轮问题", "用户在纠正已有需求"],
  },
  {
    id: "preview-promoter",
    description: "在预览草案可用时推进到 preview 阶段",
    useSecondMe: true,
    triggerHints: ["用户明确确认生成预览", "当前已有 preview_ready 草案"],
  },
  {
    id: "handoff-promoter",
    description: "在交接单可用时推进到 handoff 阶段",
    useSecondMe: true,
    triggerHints: ["用户明确要整理交接单", "当前已有 handoff_ready 条件"],
  },
];
