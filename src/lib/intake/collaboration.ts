import type { IntakeAgentOutput } from "./types";

export type RoleplayAgentId = "front_desk" | "hardware_procurement" | "software_lead";
export type RoleplayAgentStatus = "listening" | "drafting" | "ready";
export type CollaborationStage =
  | "front_desk_intake"
  | "procurement_planning"
  | "software_planning"
  | "cross_agent_sync";

export type RoleplayAgentProfile = {
  id: RoleplayAgentId;
  name: string;
  role: string;
  identity: string;
  mode: "roleplay";
  capabilities: string[];
  boundaries: string[];
};

export type RoleplayAgentCard = {
  id: Exclude<RoleplayAgentId, "front_desk">;
  name: string;
  role: string;
  mode: "roleplay";
  status: RoleplayAgentStatus;
  objective: string;
  handoff_preview: string;
};

export type CollaborationPanel = {
  version: "v1-roleplay";
  coordinator: "front_desk";
  stage: CollaborationStage;
  agents: RoleplayAgentCard[];
  profiles: RoleplayAgentProfile[];
};

export type ProjectCollaborationEvent = {
  id: string;
  ts: number;
  stage: CollaborationStage;
  from: RoleplayAgentId;
  to: RoleplayAgentId[];
  summary: string;
};

export type ProjectCollaborationRecord = {
  session_id: string;
  started_at: number;
  updated_at: number;
  stage: CollaborationStage;
  agents: RoleplayAgentProfile[];
  agent_status: Record<Exclude<RoleplayAgentId, "front_desk">, RoleplayAgentStatus>;
  timeline: ProjectCollaborationEvent[];
};

const FRONT_DESK_PROFILE: RoleplayAgentProfile = {
  id: "front_desk",
  name: "前台接待 Agent",
  role: "需求收敛与跨团队编排",
  identity: "你是项目入口协调者，负责把自然对话整理成可协作任务。",
  mode: "roleplay",
  capabilities: [
    "理解用户自然表达并提炼需求",
    "组织 preview 与 handoff 节点",
    "给采购与软件负责人分发同一份上下文",
  ],
  boundaries: ["不直接执行采购下单", "不直接替代研发负责人做技术决策"],
};

const PROCUREMENT_PROFILE: RoleplayAgentProfile = {
  id: "hardware_procurement",
  name: "硬件采购 Agent",
  role: "器件/BOM/供货风险",
  identity: "你是硬件采购规划者，负责把需求映射成可执行采购方案。",
  mode: "roleplay",
  capabilities: [
    "输出模块化器件清单与 BOM 草案",
    "识别供货周期、替代料与成本风险",
    "对接前台总结给出采购维度补充问题",
  ],
  boundaries: [
    "当前阶段为角色扮演，不实际触发采购系统",
    "项目硬件以模块化拼装为主，不包含自研硬件开发",
  ],
};

const SOFTWARE_LEAD_PROFILE: RoleplayAgentProfile = {
  id: "software_lead",
  name: "软件开发负责人 Agent",
  role: "研发拆解/接口/里程碑",
  identity: "你是软件团队负责人，负责把需求拆成研发可落地计划。",
  mode: "roleplay",
  capabilities: [
    "按模块拆解软件任务与依赖",
    "沉淀接口约束与联调边界",
    "产出迭代里程碑与风险提示",
  ],
  boundaries: [
    "当前阶段为角色扮演，不直接写入外部工单系统",
    "硬件侧默认为模块化拼装输入，不展开自研硬件实现细节",
  ],
};

const ALL_PROFILES: RoleplayAgentProfile[] = [
  FRONT_DESK_PROFILE,
  PROCUREMENT_PROFILE,
  SOFTWARE_LEAD_PROFILE,
];

function deriveRoleplayStatus(output: IntakeAgentOutput): RoleplayAgentStatus {
  const workflowState = output.state.workflow_state;

  if (workflowState === "handoff_ready" || workflowState === "handoff_completed") {
    return "ready";
  }

  if (workflowState === "preview_ready" || workflowState === "preview_generated") {
    return "drafting";
  }

  return "listening";
}

function deriveCollaborationStage(output: IntakeAgentOutput): CollaborationStage {
  const workflowState = output.state.workflow_state;

  if (workflowState === "handoff_ready" || workflowState === "handoff_completed") {
    return "cross_agent_sync";
  }

  if (workflowState === "preview_ready" || workflowState === "preview_generated") {
    return "software_planning";
  }

  return "front_desk_intake";
}

function buildProcurementPreview(output: IntakeAgentOutput) {
  const devices = output.confirmed.target_devices?.slice(0, 3).join(" / ");
  const power = output.confirmed.power?.slice(0, 2).join(" / ");
  const budget = output.confirmed.budget;
  const unknowns = output.unknowns.slice(0, 2).join("、");

  const known = [
    devices ? `目标设备：${devices}` : null,
    power ? `供电：${power}` : null,
    budget ? `预算：${budget}` : null,
  ]
    .filter(Boolean)
    .join("；");

  if (known) {
    return `先基于已知约束建立采购优先级。${known}${unknowns ? `；待补充：${unknowns}` : ""}`;
  }

  return "先收集预算、供电与目标器件清单，再输出首版模块化 BOM 采购建议。";
}

function buildSoftwareLeadPreview(output: IntakeAgentOutput) {
  const features = output.confirmed.core_features?.slice(0, 3).join(" / ");
  const interaction = output.confirmed.interaction_layout ?? output.confirmed.screen;
  const connectivity = output.confirmed.connectivity?.slice(0, 2).join(" / ");
  const unknowns = output.unknowns.slice(0, 2).join("、");

  const known = [
    features ? `核心功能：${features}` : null,
    interaction ? `交互：${interaction}` : null,
    connectivity ? `连接：${connectivity}` : null,
  ]
    .filter(Boolean)
    .join("；");

  if (known) {
    return `可先按模块拆研发计划。${known}${unknowns ? `；待补充：${unknowns}` : ""}`;
  }

  return "先沉淀功能与交互边界，再拆分软件模块、接口清单与迭代里程碑。";
}

export function buildCollaborationPanel(output: IntakeAgentOutput): CollaborationPanel {
  const status = deriveRoleplayStatus(output);
  const stage = deriveCollaborationStage(output);

  return {
    version: "v1-roleplay",
    coordinator: "front_desk",
    stage,
    profiles: ALL_PROFILES,
    agents: [
      {
        id: "hardware_procurement",
        name: PROCUREMENT_PROFILE.name,
        role: PROCUREMENT_PROFILE.role,
        mode: "roleplay",
        status,
        objective: "根据前台收敛的需求，提前形成可执行的采购清单和风险提示。",
        handoff_preview: buildProcurementPreview(output),
      },
      {
        id: "software_lead",
        name: SOFTWARE_LEAD_PROFILE.name,
        role: SOFTWARE_LEAD_PROFILE.role,
        mode: "roleplay",
        status,
        objective: "根据功能与交互约束，提前给出软件团队可落地的开发分解。",
        handoff_preview: buildSoftwareLeadPreview(output),
      },
    ],
  };
}

function buildEventId(ts: number, from: RoleplayAgentId, stage: CollaborationStage) {
  return `${ts}_${from}_${stage}`;
}

function pushEventIfNew(
  timeline: ProjectCollaborationEvent[],
  event: Omit<ProjectCollaborationEvent, "id">,
) {
  const id = buildEventId(event.ts, event.from, event.stage);
  const exists = timeline.some((item) => item.id === id);
  if (!exists) {
    timeline.push({ id, ...event });
  }
}

export function updateProjectCollaborationRecord(args: {
  sessionId: string;
  panel: CollaborationPanel;
  output: IntakeAgentOutput;
  previous?: ProjectCollaborationRecord;
  now: number;
}): ProjectCollaborationRecord {
  const previous = args.previous;
  const nextTimeline = [...(previous?.timeline ?? [])];
  const procurement = args.panel.agents.find((agent) => agent.id === "hardware_procurement");
  const softwareLead = args.panel.agents.find((agent) => agent.id === "software_lead");

  pushEventIfNew(nextTimeline, {
    ts: args.now,
    stage: args.panel.stage,
    from: "front_desk",
    to: ["hardware_procurement", "software_lead"],
    summary: `前台更新需求摘要：${args.output.requirement_summary}`,
  });

  if (procurement) {
    pushEventIfNew(nextTimeline, {
      ts: args.now + 1,
      stage: args.panel.stage,
      from: "hardware_procurement",
      to: ["front_desk", "software_lead"],
      summary: `采购建议：${procurement.handoff_preview}`,
    });
  }

  if (softwareLead) {
    pushEventIfNew(nextTimeline, {
      ts: args.now + 2,
      stage: args.panel.stage,
      from: "software_lead",
      to: ["front_desk", "hardware_procurement"],
      summary: `软件拆解建议：${softwareLead.handoff_preview}`,
    });
  }

  return {
    session_id: args.sessionId,
    started_at: previous?.started_at ?? args.now,
    updated_at: args.now,
    stage: args.panel.stage,
    agents: args.panel.profiles,
    agent_status: {
      hardware_procurement: procurement?.status ?? "listening",
      software_lead: softwareLead?.status ?? "listening",
    },
    timeline: nextTimeline.slice(-40),
  };
}
