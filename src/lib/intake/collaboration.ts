import { isLlmChatConfigured, requestLlmStructuredReply } from "./llm-client";
import type { IntakeAgentOutput } from "./types";

export type RoleplayAgentId =
  | "front_desk"
  | "hardware_procurement"
  | "software_lead"
  | "delivery_lead";
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

export type CollaborationConversationTurn = {
  from: RoleplayAgentId;
  to: RoleplayAgentId[];
  message: string;
};

export type CollaborationPanel = {
  version: "v1-roleplay";
  coordinator: "front_desk";
  stage: CollaborationStage;
  agents: RoleplayAgentCard[];
  profiles: RoleplayAgentProfile[];
  conversation: CollaborationConversationTurn[];
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
  role: "需求收敛与跨团队同步",
  identity: "你是项目入口协调者，负责把自然对话整理成可协作任务。",
  mode: "roleplay",
  capabilities: [
    "理解用户自然表达并提炼需求",
    "组织 preview 与 handoff 节点",
    "将同一份上下文同步给采购、研发与交付",
  ],
  boundaries: ["不直接执行采购下单", "不替代研发负责人做技术决策"],
};

const PROCUREMENT_PROFILE: RoleplayAgentProfile = {
  id: "hardware_procurement",
  name: "硬件采购 Agent",
  role: "器件/BOM/供应风险",
  identity: "你是硬件采购规划者，负责把需求映射成可执行采购方案。",
  mode: "roleplay",
  capabilities: [
    "输出模块化器件清单与 BOM 草案",
    "识别供货周期、替代料与成本风险",
    "对接前台总结并给出采购维度补充问题",
  ],
  boundaries: [
    "当前阶段为角色扮演，不实际触发采购系统",
    "硬件方案以模块化拼装为主，不包含自研硬件开发",
  ],
};

const SOFTWARE_LEAD_PROFILE: RoleplayAgentProfile = {
  id: "software_lead",
  name: "软件负责人 Agent",
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
    "硬件前提为模块化拼装输入，不展开自研硬件实现细节",
  ],
};

const DELIVERY_LEAD_PROFILE: RoleplayAgentProfile = {
  id: "delivery_lead",
  name: "交付 Agent",
  role: "排期/里程碑/交付节奏",
  identity: "你是交付协调负责人，负责把采购与研发节奏整合成可执行交付计划。",
  mode: "roleplay",
  capabilities: [
    "给出里程碑拆分与阶段目标",
    "对齐采购、软件开发与联调窗口",
    "识别影响演示与交付的关键依赖",
  ],
  boundaries: [
    "当前阶段为角色扮演，不直接触发外部项目管理系统",
    "硬件前提为模块化拼装，不展开自研硬件开发路径",
  ],
};

const ALL_PROFILES: RoleplayAgentProfile[] = [
  FRONT_DESK_PROFILE,
  PROCUREMENT_PROFILE,
  SOFTWARE_LEAD_PROFILE,
  DELIVERY_LEAD_PROFILE,
];

const COLLAB_FALLBACK_STRATEGY = {
  panel: {
    llm_unavailable: "use_fallback_panel",
    request_failed: "use_fallback_panel",
    invalid_json: "use_fallback_panel",
  },
} as const;

function resolveCollabFallback(
  reason: keyof typeof COLLAB_FALLBACK_STRATEGY.panel,
) {
  return COLLAB_FALLBACK_STRATEGY.panel[reason];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStage(value: unknown): CollaborationStage {
  if (
    value === "front_desk_intake" ||
    value === "procurement_planning" ||
    value === "software_planning" ||
    value === "cross_agent_sync"
  ) {
    return value;
  }
  return "front_desk_intake";
}

function stageRank(stage: CollaborationStage) {
  switch (stage) {
    case "front_desk_intake":
      return 0;
    case "procurement_planning":
      return 1;
    case "software_planning":
      return 2;
    case "cross_agent_sync":
      return 3;
    default:
      return 0;
  }
}

function stabilizeStage(llmStage: CollaborationStage, fallbackStage: CollaborationStage) {
  return stageRank(llmStage) >= stageRank(fallbackStage) ? llmStage : fallbackStage;
}

function asStatus(value: unknown): RoleplayAgentStatus {
  if (value === "ready" || value === "drafting" || value === "listening") {
    return value;
  }
  return "listening";
}

function deriveFallbackStatus(output: IntakeAgentOutput): RoleplayAgentStatus {
  const workflowState = output.state.workflow_state;
  if (workflowState === "handoff_ready" || workflowState === "handoff_completed") return "ready";
  if (workflowState === "preview_ready" || workflowState === "preview_generated") return "drafting";
  return "listening";
}

function hasProcurementSignals(output: IntakeAgentOutput) {
  const procurementUnknowns = new Set(["供电方式", "预算", "控制对象", "接口需求", "连接方式"]);
  if ((output.unknowns ?? []).some((item) => procurementUnknowns.has(item))) {
    return true;
  }
  return Boolean(
    output.confirmed.target_devices?.length ||
      output.confirmed.power?.length ||
      output.confirmed.ports?.length ||
      output.confirmed.budget,
  );
}

function deriveFallbackStage(output: IntakeAgentOutput): CollaborationStage {
  const workflowState = output.state.workflow_state;
  if (workflowState === "handoff_ready" || workflowState === "handoff_completed") return "cross_agent_sync";
  if (workflowState === "preview_ready" || workflowState === "preview_generated") return "software_planning";
  if (workflowState === "clarifying" && hasProcurementSignals(output)) {
    return "procurement_planning";
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

function buildDeliveryPreview(output: IntakeAgentOutput) {
  const timeline = output.confirmed.timeline || "T+14天（两周后）";
  const unknowns = output.unknowns.slice(0, 2).join("、");
  return `我先按「${timeline}」作为假定交付日期倒排计划。请补一个联系方式（微信或邮箱），后续我会按里程碑实时同步项目进度。${
    unknowns ? `当前仍待补充：${unknowns}` : ""
  }`;
}

function shouldAgentSpeakInStage(agent: RoleplayAgentId, stage: CollaborationStage) {
  if (agent === "front_desk") return true;
  if (stage === "front_desk_intake") return false;
  if (stage === "procurement_planning") return agent === "hardware_procurement";
  if (stage === "software_planning") {
    return agent === "hardware_procurement" || agent === "software_lead";
  }
  return true;
}

function shortList(values: string[] | undefined, count = 2) {
  return values?.slice(0, count).join(" / ");
}

function buildProcurementFreeform(output: IntakeAgentOutput) {
  const devices = shortList(output.confirmed.target_devices, 3);
  const power = shortList(output.confirmed.power, 2);
  const ports = shortList(output.confirmed.ports, 2);
  const unknowns = output.unknowns.slice(0, 2).join("、");
  const known = [
    devices ? `目标设备 ${devices}` : null,
    power ? `供电 ${power}` : null,
    ports ? `接口 ${ports}` : null,
  ]
    .filter(Boolean)
    .join("，");

  if (!known) {
    return "我先按模块化思路做一版通用 BOM，先保证器件可买、可替代、可快速到货。";
  }

  return `我先按已知条件推进采购侧方案：${known}。我会同步两档器件组合，给软件侧和前台一起看取舍${unknowns ? `；还缺 ${unknowns}` : ""}。`;
}

function buildSoftwareFreeform(output: IntakeAgentOutput) {
  const features = shortList(output.confirmed.core_features, 3);
  const interaction = output.confirmed.interaction_layout ?? output.confirmed.screen;
  const connectivity = shortList(output.confirmed.connectivity, 2);
  const unknowns = output.unknowns.slice(0, 2).join("、");
  const known = [
    features ? `功能 ${features}` : null,
    interaction ? `交互 ${interaction}` : null,
    connectivity ? `连接 ${connectivity}` : null,
  ]
    .filter(Boolean)
    .join("，");

  if (!known) {
    return "我先按功能、设备接入、状态同步三条线并行拆任务，后续根据采购结果收口接口。";
  }

  return `软件侧可先落这版：${known}。我会先把可演示路径打通，再逐步补齐边界${unknowns ? `；还需确认 ${unknowns}` : ""}。`;
}

function buildDeliveryFreeform(output: IntakeAgentOutput) {
  const timeline = output.confirmed.timeline || "T+14天（两周后）";
  const unknowns = output.unknowns.slice(0, 2).join("、");
  return `我先按「${timeline}」倒排里程碑，先保演示可交付，再收敛长期版本。麻烦留一个联系方式（微信或邮箱），我按关键节点同步进度${unknowns ? `；当前待补：${unknowns}` : ""}。`;
}

function buildFreeformConversation(output: IntakeAgentOutput, stage: CollaborationStage) {
  const turns: CollaborationConversationTurn[] = [];
  turns.push({
    from: "front_desk",
    to: ["hardware_procurement", "software_lead", "delivery_lead"],
    message: `我先同步用户诉求：${output.requirement_summary}。大家自由补充可落地建议，我来继续和用户对齐。`,
  });

  if (shouldAgentSpeakInStage("hardware_procurement", stage)) {
    turns.push({
      from: "hardware_procurement",
      to: ["front_desk", "software_lead", "delivery_lead"],
      message: buildProcurementFreeform(output),
    });
  }

  if (shouldAgentSpeakInStage("software_lead", stage)) {
    turns.push({
      from: "software_lead",
      to: ["front_desk", "hardware_procurement", "delivery_lead"],
      message: buildSoftwareFreeform(output),
    });
  }

  if (shouldAgentSpeakInStage("delivery_lead", stage)) {
    turns.push({
      from: "delivery_lead",
      to: ["front_desk", "hardware_procurement", "software_lead"],
      message: buildDeliveryFreeform(output),
    });
  }

  if (stage !== "front_desk_intake") {
    turns.push({
      from: "front_desk",
      to: ["hardware_procurement", "software_lead", "delivery_lead"],
      message: "收到，我会把你们的建议翻译成用户听得懂的选项，尽快收齐缺口并回传。",
    });
  }

  return turns;
}

function buildFallbackConversation(output: IntakeAgentOutput, stage: CollaborationStage) {
  const turns: CollaborationConversationTurn[] = [
    {
      from: "front_desk",
      to: ["hardware_procurement", "software_lead", "delivery_lead"],
      message: `我先同步当前方向：${output.requirement_summary}`,
    },
  ];

  if (shouldAgentSpeakInStage("hardware_procurement", stage)) {
    turns.push({
      from: "hardware_procurement",
      to: ["front_desk", "software_lead", "delivery_lead"],
      message: buildProcurementPreview(output),
    });
  }

  if (shouldAgentSpeakInStage("software_lead", stage)) {
    turns.push({
      from: "software_lead",
      to: ["front_desk", "hardware_procurement", "delivery_lead"],
      message: buildSoftwareLeadPreview(output),
    });
  }

  // 交付 Agent 阶段触发：仅在跨团队同步阶段广播，避免每轮重复。
  if (shouldAgentSpeakInStage("delivery_lead", stage)) {
    turns.push({
      from: "delivery_lead",
      to: ["front_desk", "hardware_procurement", "software_lead"],
      message: buildDeliveryPreview(output),
    });
  }

  return turns;
}

function buildFallbackPanel(output: IntakeAgentOutput): CollaborationPanel {
  const status = deriveFallbackStatus(output);
  const stage = deriveFallbackStage(output);

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
      {
        id: "delivery_lead",
        name: DELIVERY_LEAD_PROFILE.name,
        role: DELIVERY_LEAD_PROFILE.role,
        mode: "roleplay",
        status,
        objective: "根据采购与研发节奏，提前收敛演示与交付里程碑。",
        handoff_preview: buildDeliveryPreview(output),
      },
    ],
    conversation: buildFreeformConversation(output, stage),
  };
}

function buildCollabSystemPrompt() {
  return [
    "你是一个多 Agent 协作导演，负责为 Demo 生成像真人团队协作的沟通记录。",
    "输出必须是 JSON，不要额外解释。",
    "角色包括：前台、采购、软件负责人、交付 Agent。",
    "注意边界：当前硬件方案是模块化拼装，不涉及自研硬件开发。",
    "交付 Agent 采用阶段触发，不要每一轮都发同类广播。",
    "交付 Agent 发言时需包含：假定交付日期、联系方式请求、后续实时进度通知承诺。",
    "请生成自然中文，避免系统日志口吻。",
  ].join("\n");
}

function buildCollabUserPrompt(output: IntakeAgentOutput) {
  const preferredStage = deriveFallbackStage(output);
  return JSON.stringify(
    {
      workflow_state: output.state.workflow_state,
      next_action: output.next_action,
      preferred_stage: preferredStage,
      requirement_summary: output.requirement_summary,
      confirmed: output.confirmed,
      unknowns: output.unknowns,
      risks: output.risks,
      profiles: ALL_PROFILES,
      output_contract: {
        stage: [
          "front_desk_intake",
          "procurement_planning",
          "software_planning",
          "cross_agent_sync",
        ],
        agents: [
          {
            id: "hardware_procurement | software_lead | delivery_lead",
            status: "listening | drafting | ready",
            objective: "string",
            handoff_preview: "string",
          },
        ],
        conversation: [
          {
            from: "front_desk | hardware_procurement | software_lead | delivery_lead",
            to: ["front_desk | hardware_procurement | software_lead | delivery_lead"],
            message: "自然语言沟通内容",
          },
        ],
      },
      rules: [
        "conversation 保持 2-5 条，像团队内部短沟通，不要死板。",
        "handoff_preview 用自然短句，不是字段罗列。",
        "delivery_lead 仅在阶段切换时出场，不要轮轮重复。",
        "stage 优先跟随 preferred_stage，不要倒退到更早阶段。",
      ],
    },
    null,
    2,
  );
}

function sanitizePanelFromLlm(payload: unknown, fallback: CollaborationPanel): CollaborationPanel {
  if (!isObject(payload)) {
    return fallback;
  }

  const stage = stabilizeStage(asStage(payload.stage), fallback.stage);
  const llmAgents = Array.isArray(payload.agents) ? payload.agents.filter(isObject) : [];
  const byId = new Map(
    llmAgents
      .map((agent) => {
        const id =
          agent.id === "hardware_procurement" ||
          agent.id === "software_lead" ||
          agent.id === "delivery_lead"
            ? agent.id
            : null;
        if (!id) return null;
        const fallbackAgent = fallback.agents.find((item) => item.id === id);
        if (!fallbackAgent) return null;
        return [
          id,
          {
            ...fallbackAgent,
            status: asStatus(agent.status),
            objective:
              typeof agent.objective === "string" && agent.objective.trim()
                ? agent.objective
                : fallbackAgent.objective,
            handoff_preview:
              typeof agent.handoff_preview === "string" && agent.handoff_preview.trim()
                ? agent.handoff_preview
                : fallbackAgent.handoff_preview,
          } satisfies RoleplayAgentCard,
        ] as const;
      })
      .filter(Boolean) as Array<readonly [RoleplayAgentCard["id"], RoleplayAgentCard]>,
  );

  const conversationRaw = Array.isArray(payload.conversation) ? payload.conversation.filter(isObject) : [];
  const conversation = conversationRaw
    .map((turn) => {
      const from: RoleplayAgentId | null =
        turn.from === "front_desk" ||
        turn.from === "hardware_procurement" ||
        turn.from === "software_lead" ||
        turn.from === "delivery_lead"
          ? turn.from
          : null;
      const to =
        Array.isArray(turn.to) && turn.to.length
          ? turn.to.filter(
              (item): item is RoleplayAgentId =>
                item === "front_desk" ||
                item === "hardware_procurement" ||
                item === "software_lead" ||
                item === "delivery_lead",
            )
          : [];
      const message = typeof turn.message === "string" ? turn.message.trim() : "";
      if (!from || !to.length || !message) {
        return null;
      }
      return { from, to, message } satisfies CollaborationConversationTurn;
    })
    .filter(Boolean)
    .slice(0, 8) as CollaborationConversationTurn[];
  const stageFilteredConversation = conversation.filter((turn) =>
    shouldAgentSpeakInStage(turn.from, stage),
  );
  const uniqueConversation: CollaborationConversationTurn[] = [];
  const seen = new Set<string>();
  for (const turn of stageFilteredConversation) {
    const key = `${turn.from}::${turn.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueConversation.push(turn);
    if (uniqueConversation.length >= 5) break;
  }
  const conversationFinal =
    uniqueConversation.length >= 2 ? uniqueConversation : fallback.conversation.slice(0, 3);

  return {
    ...fallback,
    stage,
    agents: fallback.agents.map((agent) => byId.get(agent.id) ?? agent),
    conversation: conversationFinal,
  };
}

export async function buildCollaborationPanel(output: IntakeAgentOutput): Promise<CollaborationPanel> {
  const fallback = buildFallbackPanel(output);
  if (!isLlmChatConfigured()) {
    resolveCollabFallback("llm_unavailable");
    return fallback;
  }

  try {
    const content = await requestLlmStructuredReply([
      { role: "system", content: buildCollabSystemPrompt() },
      { role: "user", content: buildCollabUserPrompt(output) },
    ]);
    const payload = (() => {
      try {
        return JSON.parse(content) as unknown;
      } catch {
        return undefined;
      }
    })();
    if (!payload) {
      resolveCollabFallback("invalid_json");
      return fallback;
    }
    return sanitizePanelFromLlm(payload, fallback);
  } catch {
    resolveCollabFallback("request_failed");
    return fallback;
  }
}

function buildEventId(ts: number, from: RoleplayAgentId, index: number) {
  return `${ts}_${from}_${index}`;
}

function normalizeTimelineConversation(args: {
  now: number;
  stage: CollaborationStage;
  conversation: CollaborationConversationTurn[];
}) {
  return args.conversation.map((turn, index) => ({
    id: buildEventId(args.now, turn.from, index),
    ts: args.now + index,
    stage: args.stage,
    from: turn.from,
    to: turn.to,
    summary: turn.message,
  })) satisfies ProjectCollaborationEvent[];
}

export function updateProjectCollaborationRecord(args: {
  sessionId: string;
  panel: CollaborationPanel;
  previous?: ProjectCollaborationRecord;
  now: number;
}): ProjectCollaborationRecord {
  const previous = args.previous;
  const history = [...(previous?.timeline ?? [])];
  const nextEvents = normalizeTimelineConversation({
    now: args.now,
    stage: args.panel.stage,
    conversation: args.panel.conversation,
  });

  for (const event of nextEvents) {
    const shouldSkipDelivery =
      event.from === "delivery_lead" &&
      previous?.stage === args.panel.stage;
    if (shouldSkipDelivery) continue;

    const duplicated = history.some(
      (item) => item.from === event.from && item.summary === event.summary && item.stage === event.stage,
    );
    if (!duplicated) {
      history.push(event);
    }
  }

  const procurement = args.panel.agents.find((agent) => agent.id === "hardware_procurement");
  const softwareLead = args.panel.agents.find((agent) => agent.id === "software_lead");
  const deliveryLead = args.panel.agents.find((agent) => agent.id === "delivery_lead");

  return {
    session_id: args.sessionId,
    started_at: previous?.started_at ?? args.now,
    updated_at: args.now,
    stage: args.panel.stage,
    agents: args.panel.profiles,
    agent_status: {
      hardware_procurement: procurement?.status ?? "listening",
      software_lead: softwareLead?.status ?? "listening",
      delivery_lead: deliveryLead?.status ?? "listening",
    },
    timeline: history.slice(-50),
  };
}
