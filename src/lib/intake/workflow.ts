import type { PreviewInput } from "@/engine/preview/types";
import { detectConversationBaseMode } from "./conversation-base";
import { analyzeConversationMemory } from "./memory";
import { planReplyOrchestration } from "./orchestration";
import { buildIntakeSystemPrompt, buildIntakeUserPrompt } from "./prompt";
import { decideReadinessFlow } from "./readiness";
import { buildReminderBundle } from "./reminders";
import { analyzeRequirementReasoning } from "./reasoning";
import { isSecondMeChatConfigured, requestSecondMeChatReply } from "./secondme-client";
import { routeIntakeSkills } from "./skills";
import { buildIntakeSuggestions } from "./suggestions";
import { buildStructuredIntakeOutput } from "./state-pipeline";
import {
  createEmptyState,
  type ConversationTurn,
  type ConfirmedRequirement,
  type IntakeAgentOutput,
  type IntakeAgentRequest,
  type IntakeAgentState,
  type IntakeIntent,
  type IntakeNextAction,
  type LabHandoff,
  type PreviewDraft,
  type PreviewReadiness,
  type IntakeSuggestion,
} from "./types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeArrays(left?: string[], right?: string[]) {
  return unique([...(left ?? []), ...(right ?? [])]);
}

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function inferIntent(message: string): IntakeIntent {
  if (hasPattern(message, [/(维修|修复|问题|故障|异常)/])) return "support";
  if (hasPattern(message, [/(升级|改造|迭代)/])) return "upgrade";
  if (hasPattern(message, [/(原型|demo|验证|试做)/i])) return "prototype";
  if (hasPattern(message, [/(定制|做一个|开发一个|设计一个|产品)/])) {
    return "custom_device";
  }
  return "consulting";
}

function inferDeviceType(message: string) {
  if (hasPattern(message, [/(手表|穿戴)/])) return "智能手表";
  if (hasPattern(message, [/(遥控器|红外)/])) return "红外遥控器";
  if (hasPattern(message, [/(桌面|桌宠|桌上)/])) return "桌面设备";
  if (hasPattern(message, [/(音箱|音响|speaker)/i])) return "蓝牙音箱";
  if (hasPattern(message, [/(手持|便携)/])) return "手持设备";
  return undefined;
}

function collectKeywords(message: string, patterns: Array<[RegExp, string]>) {
  return patterns
    .filter(([pattern]) => pattern.test(message))
    .map(([, value]) => value);
}

function extractApproxSize(message: string) {
  const matched = message.match(
    /(\d{2,4})\s*[xX*×]\s*(\d{2,4})\s*[xX*×]\s*(\d{2,4})\s*(mm|毫米)?/i,
  );
  if (!matched) return undefined;
  return `${matched[1]} x ${matched[2]} x ${matched[3]} mm`;
}

function deriveConfirmed(
  message: string,
  current: ConfirmedRequirement,
): ConfirmedRequirement {
  const connectivity = collectKeywords(message, [
    [/蓝牙/i, "蓝牙"],
    [/(wi-?fi|wifi)/i, "Wi-Fi"],
    [/(4g|lte)/i, "4G"],
    [/gps/i, "GPS"],
  ]);
  const sensors = collectKeywords(message, [
    [/imu/i, "IMU"],
    [/温度/, "温度传感器"],
    [/湿度/, "湿度传感器"],
    [/压力/, "压力传感器"],
    [/(摄像头|相机)/, "摄像头"],
    [/麦克风/, "麦克风"],
  ]);
  const controls = collectKeywords(message, [
    [/(按钮|按键)/, "按钮"],
    [/旋钮/, "旋钮"],
    [/(触控|触摸)/, "触控"],
    [/语音/, "语音"],
  ]);
  const ports = collectKeywords(message, [
    [/(usb-?c|type-?c)/i, "USB-C"],
    [/(音频|耳机)/, "音频口"],
    [/(电源口|dc)/i, "电源口"],
    [/(网口|rj45)/i, "RJ45"],
  ]);
  const power = collectKeywords(message, [
    [/(电池|充电)/, "电池供电"],
    [/(外接供电|适配器)/, "外接供电"],
  ]);
  const coreFeatures = collectKeywords(message, [
    [/(显示|屏幕)/, "显示"],
    [/(遥控|红外)/, "红外控制"],
    [/(监测|检测|采集)/, "数据采集"],
    [/(联网|连接|同步手机)/, "无线连接"],
    [/(播放|音频|音响)/, "音频播放"],
    [/(运动|记录运动数据)/, "运动记录"],
  ]);

  const normalizedMessage = message.replace(/\s+/g, "");
  const useCase =
    current.use_case ??
    message.match(/用于([^，。；]+)/)?.[1]?.trim() ??
    message.match(/给([^，。；]+)用/)?.[1]?.trim() ??
    (hasPattern(normalizedMessage, [/(家里用|家用|家庭用)/]) ? "家庭环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(出门用|外出用|随身用|在外面用)/]) ? "外出环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(酒店|宾馆|民宿)/]) ? "酒店环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(办公室|办公桌|工位)/]) ? "办公环境" : undefined);

  return {
    ...current,
    device_type: current.device_type ?? inferDeviceType(message),
    use_case: useCase,
    screen:
      current.screen ??
      (hasPattern(message, [/(屏幕|显示|触控|触摸|触屏)/])
        ? hasPattern(message, [/(触控|触摸)/])
          ? "触控屏"
          : "显示屏"
        : undefined),
    controls: mergeArrays(current.controls, controls),
    sensors: mergeArrays(current.sensors, sensors),
    connectivity: mergeArrays(current.connectivity, connectivity),
    ports: mergeArrays(current.ports, ports),
    power: mergeArrays(current.power, power),
    core_features: mergeArrays(current.core_features, coreFeatures),
    size: current.size ?? extractApproxSize(message),
  };
}

function computeUnknowns(confirmed: ConfirmedRequirement) {
  const unknowns: string[] = [];
  if (!confirmed.device_type) unknowns.push("设备类型");
  if (!confirmed.use_case) unknowns.push("使用场景");
  if (!confirmed.core_features?.length) unknowns.push("核心功能");
  if (!confirmed.screen && !confirmed.controls?.length && !confirmed.ports?.length) {
    unknowns.push("主要交互方式");
  }
  if (!confirmed.power?.length) unknowns.push("供电方式");
  return unknowns;
}

function buildPreviewReadiness(confirmed: ConfirmedRequirement): PreviewReadiness {
  const missing: string[] = [];
  const assumptions: string[] = [];

  if (!confirmed.device_type) missing.push("设备类型");
  if (!confirmed.use_case) missing.push("使用场景");
  if (!confirmed.screen && !confirmed.controls?.length && !confirmed.ports?.length) {
    missing.push("交互方式");
  }
  if (!confirmed.power?.length) missing.push("供电方式");
  if (
    !confirmed.core_features?.length &&
    !confirmed.sensors?.length &&
    !confirmed.connectivity?.length
  ) {
    missing.push("主要功能模块");
  }

  if (!confirmed.size) {
    assumptions.push("未提供精确尺寸，将使用设备模板默认外形尺寸");
  }

  return {
    ready: missing.length === 0,
    missing,
    assumptions,
  };
}

function defaultShellForDevice(deviceType?: string) {
  switch (deviceType) {
    case "智能手表":
      return {
        shell: "cuboid" as const,
        shellSize: { width: 48, height: 48, depth: 18 },
        cols: 5,
        rows: 4,
      };
    case "红外遥控器":
      return {
        shell: "cuboid" as const,
        shellSize: { width: 46, height: 156, depth: 18 },
        cols: 6,
        rows: 3,
      };
    case "桌面设备":
      return {
        shell: "cuboid" as const,
        shellSize: { width: 92, height: 110, depth: 86 },
        cols: 6,
        rows: 5,
      };
    case "蓝牙音箱":
      return {
        shell: "cuboid" as const,
        shellSize: { width: 160, height: 72, depth: 72 },
        cols: 7,
        rows: 4,
      };
    default:
      return {
        shell: "cuboid" as const,
        shellSize: { width: 88, height: 120, depth: 26 },
        cols: 6,
        rows: 5,
      };
  }
}

function mapConfirmedToPreviewDraft(
  confirmed: ConfirmedRequirement,
): PreviewDraft | undefined {
  const readiness = buildPreviewReadiness(confirmed);
  if (!readiness.ready) {
    return undefined;
  }

  const base = defaultShellForDevice(confirmed.device_type);
  const assumptions = [...readiness.assumptions];
  const modules: PreviewInput["modules"] = [];
  const ports: NonNullable<PreviewInput["ports"]> = [];

  if (confirmed.screen) {
    assumptions.push("默认屏幕位于前壳");
  }

  const useHighCore =
    Boolean(confirmed.screen) ||
    (confirmed.connectivity?.length ?? 0) > 0 ||
    (confirmed.sensors?.length ?? 0) > 0;
  modules.push(useHighCore ? "esp32_s3" : "esp32");
  assumptions.push(`默认使用 ${useHighCore ? "ESP32-S3" : "ESP32"} 作为主控`);

  if (confirmed.power?.includes("电池供电")) modules.push("battery");
  if (confirmed.connectivity?.includes("蓝牙")) modules.push("bluetooth");
  if (confirmed.connectivity?.includes("Wi-Fi")) modules.push("wifi");
  if (confirmed.connectivity?.includes("GPS")) modules.push("gps");
  if (confirmed.sensors?.includes("IMU")) modules.push("imu_sensor");
  if (confirmed.sensors?.includes("摄像头")) modules.push("camera_module");
  if (confirmed.sensors?.includes("麦克风")) modules.push("microphone_array");

  if (confirmed.controls?.includes("按钮")) {
    modules.push("button_array");
    ports.push({
      face: confirmed.device_type === "红外遥控器" ? "front" : "left",
      type: "button_cutout",
      sizeMm: { width: 8, height: 8, depth: 4 },
    });
  }

  if (confirmed.ports?.includes("USB-C")) {
    ports.push({
      face: confirmed.device_type === "红外遥控器" ? "bottom" : "right",
      type: "usb_c",
      sizeMm: { width: 10, height: 6, depth: 6 },
    });
  }
  if (confirmed.ports?.includes("音频口")) {
    ports.push({
      face: "back",
      type: "audio_jack",
      sizeMm: { width: 10, height: 10, depth: 8 },
    });
  }
  if (confirmed.ports?.includes("电源口")) {
    ports.push({
      face: "back",
      type: "power_jack",
      sizeMm: { width: 12, height: 10, depth: 10 },
    });
  }
  if (confirmed.core_features?.includes("红外控制")) {
    ports.push({
      face: "front",
      type: "ir_window",
      sizeMm: { width: 12, height: 8, depth: 4 },
    });
    modules.push("infrared_blaster");
  }

  const input: PreviewInput = {
    shell: base.shell,
    shellSize: base.shellSize,
    board: {
      placement: "center",
      grid: { cols: base.cols, rows: base.rows },
    },
    mainScreen: confirmed.screen
      ? {
          face: "front",
          type: confirmed.screen.includes("触控") ? "touch_display" : "display_panel",
          sizeMm:
            confirmed.device_type === "红外遥控器"
              ? { width: 22, height: 68, depth: 4 }
              : confirmed.device_type === "智能手表"
                ? { width: 30, height: 34, depth: 3 }
                : { width: 40, height: 60, depth: 4 },
        }
      : undefined,
    ports: ports.length ? ports : undefined,
    modules: unique(modules.map(String)),
  };

  return {
    readiness,
    assumptions,
    input,
  };
}

function buildLabHandoff(
  confirmed: ConfirmedRequirement,
  requirementSummary: string,
  unknowns: string[],
  risks: string[],
  previewDraft?: PreviewDraft,
): LabHandoff | undefined {
  if (!confirmed.device_type || (!confirmed.core_features?.length && !previewDraft)) {
    return undefined;
  }

  return {
    customer_summary: requirementSummary,
    project_type: confirmed.device_type,
    use_case: confirmed.use_case ?? "待补充",
    target_users: confirmed.target_users,
    core_features: confirmed.core_features?.length
      ? confirmed.core_features
      : ["基于当前已确认硬件要素生成初步方案"],
    hardware_requirements: {
      screen: confirmed.screen,
      controls: confirmed.controls,
      sensors: confirmed.sensors,
      audio: confirmed.audio,
      connectivity: confirmed.connectivity,
      power: confirmed.power,
      ports: confirmed.ports,
    },
    constraints: {
      size: confirmed.size,
      budget: confirmed.budget,
      timeline: confirmed.timeline,
      environment: confirmed.environment,
    },
    references: confirmed.references ?? [],
    unknowns,
    risks,
    recommended_next_step:
      unknowns.length > 0 ? "继续补齐缺失需求后进入实验室评估" : "进入实验室进行技术评估与原型拆解",
    preview_input_draft: previewDraft,
  };
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

function buildFallbackCustomerReply(args: {
  confirmed: ConfirmedRequirement;
  nextAction: IntakeNextAction;
  previewDraft?: PreviewDraft;
  unknowns?: string[];
  suggestions?: string[];
  recommendationCards?: IntakeSuggestion[];
}) {
  const summary = buildRequirementSummary(args.confirmed);

  if (args.nextAction === "generate_preview" && args.previewDraft) {
    return summary
      ? "我已经可以先按这个方向给你生成一版 3D 草案了。"
      : "我已经可以先给你生成一版 3D 草案了。";
  }

  if (args.nextAction === "prepare_handoff" || args.nextAction === "handoff_to_lab") {
    return "这边已经可以整理实验室交接单了。";
  }

  if (args.previewDraft && args.unknowns?.length) {
    return `我大概已经能先拼出一版方向了，不过还差${args.unknowns.slice(0, 2).join("、")}。你要是愿意，我也可以先给你一点建议，我们再决定要不要出 3D 草案。`;
  }

  if (args.recommendationCards?.length) {
    return `我先给你一个方向：${args.recommendationCards[0]?.detail}`;
  }

  if (args.suggestions?.length) {
    return `我先给你一个小建议：${args.suggestions[0]}`;
  }

  if (summary) {
    return "我先按你刚才说的方向继续往下收。";
  }

  return "你继续说，我先听着。";
}

async function buildModelCustomerReply(request: IntakeAgentRequest, draft: {
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  nextAction: IntakeNextAction;
  previewDraft?: PreviewDraft;
  reasoning: ReturnType<typeof analyzeRequirementReasoning>;
  suggestions: IntakeSuggestion[];
  orchestration: ReturnType<typeof planReplyOrchestration>;
  reminderBundle: ReturnType<typeof buildReminderBundle>;
  memory: ReturnType<typeof analyzeConversationMemory>;
}) {
  if (!isSecondMeChatConfigured()) {
    return null;
  }

  const route = routeIntakeSkills({
    message: request.message,
    state: request.state,
    confirmed: draft.confirmed,
    unknowns: draft.unknowns,
    previewDraft: draft.previewDraft,
    history: request.history,
    memory: draft.memory,
  });

  const prompt = [
    buildIntakeUserPrompt(request),
    JSON.stringify(
      {
        conversation_mode: detectConversationBaseMode(request.message),
        active_skill: route.active_skill,
        matched_skills: route.matched_skills,
        routing_reason: route.reason,
        confirmed: draft.confirmed,
        unknowns: draft.unknowns,
        reasoning_profile: draft.reasoning.profile,
        reasoning_must_confirm: draft.reasoning.mustConfirm,
        reasoning_suggestions: draft.reasoning.suggestions,
        reasoning_risks: draft.reasoning.risks,
        recommendation_cards: draft.suggestions,
        reminders: draft.reminderBundle.reminders,
        risk_alerts: draft.reminderBundle.riskAlerts,
        conversation_memory: draft.memory,
        reply_priorities: draft.orchestration.priorities,
        transition_mode: draft.orchestration.transitionMode,
        single_focus: draft.orchestration.singleFocus,
        next_action: draft.nextAction,
        preview_ready: Boolean(draft.previewDraft),
      },
      null,
      2,
    ),
    [
      "请只输出一段自然中文回复，不要输出 JSON。",
      "不要复述结构化字段名。",
      "不要把自己说得像表单机器人。",
      "如果只是闲聊或寒暄，就先接住话，不要急着办事。",
      "如果需要追问，通常只问一个最关键的问题。",
      "回复尽量控制在 2 到 5 句。",
    ].join("\n"),
  ].join("\n\n");

  try {
    return await requestSecondMeChatReply([
      { role: "system", content: buildIntakeSystemPrompt() },
      { role: "user", content: prompt },
    ]);
  } catch {
    return null;
  }
}

export async function runIntakeWorkflow(
  sessionId: string,
  message: string,
  state: IntakeAgentState = createEmptyState(),
  history: ConversationTurn[] = [],
): Promise<IntakeAgentOutput> {
  const request: IntakeAgentRequest = {
    session_id: sessionId,
    locale: "zh-CN",
    message,
    state,
    history,
  };

  const confirmed = deriveConfirmed(message, state.confirmed);
  const reasoning = analyzeRequirementReasoning(confirmed);
  const suggestions = buildIntakeSuggestions(confirmed, reasoning);
  const reminderBundle = buildReminderBundle(confirmed);
  const unknowns = unique([...computeUnknowns(confirmed), ...reasoning.mustConfirm]);
  const previewDraft = mapConfirmedToPreviewDraft(confirmed);
  const memory = analyzeConversationMemory({
    message,
    history,
    unknowns,
  });
  const route = routeIntakeSkills({
    message,
    state,
    confirmed,
    unknowns,
    previewDraft,
    history,
    memory,
  });
  const orchestration = planReplyOrchestration({
    message,
    confirmed,
    unknowns,
    nextAction: "ask_more",
    route,
    previewDraft,
    memory,
  });

  const risks = unique([
    ...state.risks,
    ...reasoning.risks,
    ...reminderBundle.riskAlerts,
    ...(previewDraft ? [] : ["当前信息还不足以稳定生成 3D 预览草案"]),
  ]);

  const requirementSummary = buildRequirementSummary(confirmed);
  const labHandoff = buildLabHandoff(
    confirmed,
    requirementSummary,
    unknowns,
    risks,
    previewDraft,
  );
  const readiness = decideReadinessFlow({
    message,
    previewDraft,
    labHandoff,
    state:
      orchestration.transitionMode === "stay_conversational"
        ? { ...state, workflow_state: "collecting" }
        : state,
    unknowns,
  });

  const workflowState: IntakeAgentState["workflow_state"] =
    orchestration.transitionMode === "stay_conversational"
      ? "collecting"
      : readiness.workflowState;
  const nextAction: IntakeNextAction =
    orchestration.transitionMode === "stay_conversational"
      ? "ask_more"
      : readiness.nextAction;

  const exposedPreviewDraft = readiness.exposePreview ? previewDraft : undefined;
  const exposedLabHandoff = readiness.exposeHandoff ? labHandoff : undefined;

  const customerReply =
    (await buildModelCustomerReply(request, {
      confirmed,
      unknowns,
      nextAction,
      previewDraft: exposedPreviewDraft ?? previewDraft,
      reasoning,
      suggestions,
      orchestration,
      reminderBundle,
      memory,
    })) ??
    buildFallbackCustomerReply({
      confirmed,
      nextAction,
      previewDraft: exposedPreviewDraft ?? previewDraft,
      unknowns,
      suggestions: reasoning.suggestions,
      recommendationCards: suggestions,
    });

  const structuredOutput = buildStructuredIntakeOutput({
    workflowState,
    confirmed,
    unknowns,
    risks,
    suggestions,
    assumptions: previewDraft?.assumptions ?? [],
    previewDraft,
    labHandoff,
    exposedPreviewDraft,
    exposedLabHandoff,
    requirementSummary: requirementSummary || "已记录当前对话，等待进一步补充。",
    intent: inferIntent(message),
    nextAction,
  });

  return {
    customer_reply: customerReply,
    ...structuredOutput,
  };

  /*
  const structuredOutput = buildStructuredIntakeOutput({
    workflowState,
    confirmed,
    unknowns,
    risks,
    suggestions,
    assumptions: previewDraft?.assumptions ?? [],
    previewDraft,
    labHandoff,
    exposedPreviewDraft,
    exposedLabHandoff,
    requirementSummary:
      requirementSummary || "宸茶褰曞綋鍓嶅璇濓紝绛夊緟杩涗竴姝ヨˉ鍏呫€?,
    intent: inferIntent(message),
    nextAction,
  });

  return {
    customer_reply: customerReply,
    ...structuredOutput,
  };

  /*
  return {
    customer_reply: customerReply,
    state: {
      workflow_state: workflowState,
      confirmed,
      unknowns,
      risks,
      suggestions,
      assumptions: previewDraft?.assumptions ?? [],
      preview_input_draft: previewDraft,
      lab_handoff: labHandoff,
    },
    intent: inferIntent(message),
    requirement_summary: requirementSummary || "已记录当前对话，等待进一步补充。",
    confirmed,
    unknowns,
    risks,
    suggestions,
    preview_input_draft: exposedPreviewDraft,
    lab_handoff: exposedLabHandoff,
    next_action: nextAction,
  };
  */
}
