import type { IntakeAgentOutput } from "./types";

export type RoleplayAgentStatus = "listening" | "drafting" | "ready";

export type RoleplayAgentCard = {
  id: "hardware_procurement" | "software_lead";
  name: string;
  role: string;
  mode: "roleplay";
  status: RoleplayAgentStatus;
  objective: string;
  handoff_preview: string;
};

export type CollaborationPanel = {
  version: "v0-roleplay";
  coordinator: "front_desk";
  agents: RoleplayAgentCard[];
};

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

function buildProcurementPreview(output: IntakeAgentOutput) {
  const devices = output.confirmed.target_devices?.slice(0, 3).join(" / ");
  const power = output.confirmed.power?.slice(0, 2).join(" / ");
  const budget = output.confirmed.budget;
  const unknowns = output.unknowns.slice(0, 2).join("、");

  const known = [devices ? `目标设备：${devices}` : null, power ? `供电：${power}` : null, budget ? `预算：${budget}` : null]
    .filter(Boolean)
    .join("；");

  if (known) {
    return `先基于已知约束建立采购优先级。${known}${unknowns ? `；待补充：${unknowns}` : ""}`;
  }

  return "先收集预算、供电与目标器件清单，再输出首版 BOM 采购建议。";
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

  return {
    version: "v0-roleplay",
    coordinator: "front_desk",
    agents: [
      {
        id: "hardware_procurement",
        name: "硬件采购 Agent",
        role: "器件/BOM/供货风险",
        mode: "roleplay",
        status,
        objective: "根据前台收敛的需求，提前形成可执行的采购清单和风险提示。",
        handoff_preview: buildProcurementPreview(output),
      },
      {
        id: "software_lead",
        name: "软件开发负责人 Agent",
        role: "研发拆解/接口/里程碑",
        mode: "roleplay",
        status,
        objective: "根据功能与交互约束，提前给出软件团队可落地的开发分解。",
        handoff_preview: buildSoftwareLeadPreview(output),
      },
    ],
  };
}
