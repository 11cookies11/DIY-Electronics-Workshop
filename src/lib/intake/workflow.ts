import type { PreviewInput } from "@/engine/preview/types";
import {
  buildIntakeSystemPrompt,
  buildIntakeUserPrompt,
} from "./prompt";
import {
  isSecondMeChatConfigured,
  requestSecondMeStructuredReply,
} from "./secondme-client";
import {
  createEmptyState,
  type ConfirmedRequirement,
  type IntakeAgentOutput,
  type IntakeAgentRequest,
  type IntakeAgentState,
  type IntakeIntent,
  type IntakeNextAction,
  type LabHandoff,
  type PreviewDraft,
  type PreviewReadiness,
} from "./types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeArrays(left?: string[], right?: string[]) {
  return unique([...(left ?? []), ...(right ?? [])]);
}

function inferIntent(message: string): IntakeIntent {
  if (/(维修|修复|问题|故障|异常)/.test(message)) return "support";
  if (/(升级|改造|迭代)/.test(message)) return "upgrade";
  if (/(原型|demo|验证|试做)/i.test(message)) return "prototype";
  if (/(定制|做一个|开发一个|设计一个|产品)/.test(message)) return "custom_device";
  return "consulting";
}

function inferDeviceType(message: string) {
  if (/(手表|穿戴)/.test(message)) return "智能手表";
  if (/(遥控器|红外)/.test(message)) return "红外遥控器";
  if (/(桌面|桌宠|桌上)/.test(message)) return "桌面设备";
  if (/(音箱|音响|speaker)/i.test(message)) return "蓝牙音箱";
  if (/(手持|手持机|便携)/.test(message)) return "手持设备";
  return undefined;
}

function collectKeywords(message: string, patterns: Array<[RegExp, string]>) {
  return patterns
    .filter(([pattern]) => pattern.test(message))
    .map(([, value]) => value);
}

function extractApproxSize(message: string) {
  const matched = message.match(/(\d{2,4})\s*[x×*]\s*(\d{2,4})\s*[x×*]\s*(\d{2,4})\s*(mm|毫米)?/i);
  if (!matched) return undefined;
  return `${matched[1]} x ${matched[2]} x ${matched[3]} mm`;
}

function deriveConfirmed(message: string, current: ConfirmedRequirement): ConfirmedRequirement {
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
    [/摄像头|相机/, "摄像头"],
    [/麦克风/, "麦克风"],
  ]);
  const controls = collectKeywords(message, [
    [/按钮|按键/, "按钮"],
    [/旋钮/, "旋钮"],
    [/触控|触摸/, "触控"],
    [/语音/, "语音"],
  ]);
  const ports = collectKeywords(message, [
    [/(usb-?c|type-?c)/i, "USB-C"],
    [/音频|耳机/, "音频口"],
    [/电源口|dc/, "电源口"],
    [/网口|rj45/i, "RJ45"],
  ]);
  const power = collectKeywords(message, [
    [/电池|充电/, "电池供电"],
    [/外接供电|适配器/, "外接供电"],
  ]);
  const coreFeatures = collectKeywords(message, [
    [/显示|屏幕/, "显示"],
    [/遥控|红外/, "红外控制"],
    [/监测|检测/, "数据采集"],
    [/联网|连接/, "无线连接"],
    [/播放|音频|音响/, "音频播放"],
  ]);

  return {
    ...current,
    device_type: current.device_type ?? inferDeviceType(message),
    screen: current.screen ?? (/(屏幕|显示|触控)/.test(message) ? (/(触控|触摸)/.test(message) ? "触控屏" : "显示屏") : undefined),
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
  if (!confirmed.screen && !confirmed.controls?.length && !confirmed.ports?.length) {
    missing.push("交互方式");
  }
  if (!confirmed.core_features?.length && !confirmed.sensors?.length && !confirmed.connectivity?.length) {
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
      return { shell: "cuboid" as const, shellSize: { width: 48, height: 48, depth: 18 }, cols: 5, rows: 4 };
    case "红外遥控器":
      return { shell: "cuboid" as const, shellSize: { width: 46, height: 156, depth: 18 }, cols: 6, rows: 3 };
    case "桌面设备":
      return { shell: "cuboid" as const, shellSize: { width: 92, height: 110, depth: 86 }, cols: 6, rows: 5 };
    case "蓝牙音箱":
      return { shell: "cuboid" as const, shellSize: { width: 160, height: 72, depth: 72 }, cols: 7, rows: 4 };
    default:
      return { shell: "cuboid" as const, shellSize: { width: 88, height: 120, depth: 26 }, cols: 6, rows: 5 };
  }
}

function mapConfirmedToPreviewDraft(confirmed: ConfirmedRequirement): PreviewDraft | undefined {
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

  if (confirmed.power?.includes("电池供电")) {
    modules.push("battery");
  }
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
  if (!confirmed.device_type || !confirmed.core_features?.length) {
    return undefined;
  }

  return {
    customer_summary: requirementSummary,
    project_type: confirmed.device_type,
    use_case: confirmed.use_case ?? "待补充",
    target_users: confirmed.target_users,
    core_features: confirmed.core_features,
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
    confirmed.connectivity?.length ? `连接：${confirmed.connectivity.join("、")}` : undefined,
    confirmed.power?.length ? `供电：${confirmed.power.join("、")}` : undefined,
  ]
    .filter(Boolean)
    .join("；");
}

function buildCustomerReply(
  confirmed: ConfirmedRequirement,
  unknowns: string[],
  nextAction: IntakeNextAction,
  previewDraft?: PreviewDraft,
) {
  const summary = buildRequirementSummary(confirmed) || "我已经开始整理你的设备需求。";
  if (nextAction === "generate_preview" && previewDraft) {
    return `${summary}。我已经可以先给出一个 3D 结构草案，接下来会基于这个草案继续细化。`;
  }

  if (nextAction === "prepare_handoff" || nextAction === "handoff_to_lab") {
    return `${summary}。当前信息已经接近可以交给实验室评估，我会先整理成交接单。`;
  }

  if (unknowns.length > 0) {
    return `${summary}。为了继续推进，我还需要确认这些信息：${unknowns.join("、")}。`;
  }

  return `${summary}。我已经记录下当前需求，可以继续细化交互、结构和模块配置。`;
}

function validateStructuredOutput(value: unknown): IntakeAgentOutput | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<IntakeAgentOutput>;
  if (
    typeof data.customer_reply !== "string" ||
    typeof data.requirement_summary !== "string" ||
    !data.state ||
    !data.confirmed ||
    !Array.isArray(data.unknowns) ||
    !Array.isArray(data.risks) ||
    typeof data.next_action !== "string"
  ) {
    return null;
  }
  return data as IntakeAgentOutput;
}

async function trySecondMeStructured(
  request: IntakeAgentRequest,
): Promise<IntakeAgentOutput | null> {
  if (!isSecondMeChatConfigured()) {
    return null;
  }

  const raw = await requestSecondMeStructuredReply([
    { role: "system", content: buildIntakeSystemPrompt() },
    { role: "user", content: buildIntakeUserPrompt(request) },
  ]);
  const parsed = JSON.parse(raw) as unknown;
  return validateStructuredOutput(parsed);
}

export async function runIntakeWorkflow(
  sessionId: string,
  message: string,
  state: IntakeAgentState = createEmptyState(),
): Promise<IntakeAgentOutput> {
  const request: IntakeAgentRequest = {
    session_id: sessionId,
    locale: "zh-CN",
    message,
    state,
  };

  try {
    const result = await trySecondMeStructured(request);
    if (result) {
      return result;
    }
  } catch {
    // Fall back to local workflow when the external model is unavailable.
  }

  const confirmed = deriveConfirmed(message, state.confirmed);
  const unknowns = computeUnknowns(confirmed);
  const previewDraft = mapConfirmedToPreviewDraft(confirmed);
  const risks = unique([
    ...state.risks,
    ...(previewDraft ? [] : ["当前信息仍不足以稳定生成 3D 预览草案"]),
  ]);

  let workflowState: IntakeAgentState["workflow_state"] =
    unknowns.length > 0 ? "clarifying" : "preview_ready";
  let nextAction: IntakeNextAction = unknowns.length > 0 ? "ask_more" : "generate_preview";

  if (previewDraft) {
    workflowState = "preview_generated";
    nextAction = "prepare_handoff";
  }

  const requirementSummary = buildRequirementSummary(confirmed);
  const labHandoff = buildLabHandoff(
    confirmed,
    requirementSummary,
    unknowns,
    risks,
    previewDraft,
  );

  if (labHandoff && unknowns.length <= 2) {
    workflowState = "handoff_ready";
  }

  return {
    customer_reply: buildCustomerReply(confirmed, unknowns, nextAction, previewDraft),
    state: {
      workflow_state: workflowState,
      confirmed,
      unknowns,
      risks,
      assumptions: previewDraft?.assumptions ?? [],
      preview_input_draft: previewDraft,
      lab_handoff: labHandoff,
    },
    intent: inferIntent(message),
    requirement_summary: requirementSummary || "已记录客户需求，等待继续补充。",
    confirmed,
    unknowns,
    risks,
    preview_input_draft: previewDraft,
    lab_handoff: labHandoff,
    next_action: nextAction,
  };
}
