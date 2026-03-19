import type { PreviewInput } from "@/engine/preview/types";
import { inferDeviceTypeFromArchetype } from "./archetypes";
import { detectConversationBaseMode } from "./conversation-base";
import { analyzeConversationMemory } from "./memory";
import { planReplyOrchestration, type ReplyOrchestration } from "./orchestration";
import {
  buildIntakeReasoningSystemPrompt,
  buildIntakeReasoningUserPrompt,
  buildLlmNativeDecisionSystemPrompt,
  buildLlmNativeDecisionUserPrompt,
  buildIntakeSystemPrompt,
  buildIntakeUserPrompt,
} from "./prompt";
import { decideReadinessFlow } from "./readiness";
import { buildReminderBundle } from "./reminders";
import { analyzeRequirementReasoning } from "./reasoning";
import {
  isSecondMeChatConfigured,
  requestSecondMeChatReply,
} from "./secondme-client";
import { parseConversationSignals } from "./signals";
import { buildIntakeSuggestions } from "./suggestions";
import {
  deriveRisksFromSlotAssessments,
  deriveUnknownsFromSlotAssessments,
  sanitizeLlmNativeDecision,
} from "./llm-native";
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
  type IntakeReasoningPatch,
  type IntakeReasoningTrace,
  type IntakeSkillRoute,
  type LabHandoff,
  type LlmNativeDecision,
  type PreviewDraft,
  type PreviewReadiness,
  type IntakeSuggestion,
} from "./types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function canonicalizeUnknownField(field: string) {
  if (field.includes("交互")) {
    return "主要交互方式";
  }
  return field;
}

function normalizeUnknownFields(fields: string[]) {
  return unique(fields.map(canonicalizeUnknownField));
}

function mergeArrays(left?: string[], right?: string[]) {
  return unique([...(left ?? []), ...(right ?? [])]);
}

function mergeOrReplaceArrays(
  left: string[] | undefined,
  right: string[],
  shouldReplace: boolean,
) {
  if (!right.length) return left;
  return shouldReplace ? unique(right) : mergeArrays(left, right);
}

function preferOverride<T>(
  current: T | undefined,
  candidate: T | undefined,
  shouldReplace: boolean,
) {
  if (shouldReplace && candidate !== undefined) return candidate;
  return current ?? candidate;
}

function uniqueModules(modules: PreviewInput["modules"]) {
  const seen = new Set<string>();

  return modules.filter((entry) => {
    const id = typeof entry === "string" ? entry : entry.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const ARRAY_REQUIREMENT_FIELDS: Array<keyof ConfirmedRequirement> = [
  "target_devices",
  "core_features",
  "controls",
  "button_preferences",
  "sensors",
  "audio",
  "connectivity",
  "ports",
  "power",
  "references",
];

const SCALAR_REQUIREMENT_FIELDS: Array<keyof ConfirmedRequirement> = [
  "device_type",
  "use_case",
  "target_users",
  "screen",
  "screen_size_preference",
  "interaction_layout",
  "size",
  "placement",
  "portability",
  "budget",
  "timeline",
  "environment",
];

function isConfirmedRequirementField(value: string): value is keyof ConfirmedRequirement {
  return (
    ARRAY_REQUIREMENT_FIELDS.includes(value as keyof ConfirmedRequirement) ||
    SCALAR_REQUIREMENT_FIELDS.includes(value as keyof ConfirmedRequirement)
  );
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return unique(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function sanitizeModelRequirementPatch(raw: unknown): IntakeReasoningPatch | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const source = raw as Record<string, unknown>;
  const confirmedPatch = {} as Partial<ConfirmedRequirement>;
  const arrayPatch = confirmedPatch as Record<string, string[] | undefined>;
  const scalarPatch = confirmedPatch as Record<string, string | undefined>;

  for (const field of ARRAY_REQUIREMENT_FIELDS) {
    const normalized = normalizeStringArray(source.confirmed_patch && typeof source.confirmed_patch === "object"
      ? (source.confirmed_patch as Record<string, unknown>)[field]
      : undefined);
    if (normalized?.length) {
      arrayPatch[field] = normalized;
    }
  }

  for (const field of SCALAR_REQUIREMENT_FIELDS) {
    const candidate =
      source.confirmed_patch && typeof source.confirmed_patch === "object"
        ? (source.confirmed_patch as Record<string, unknown>)[field]
        : undefined;
    if (typeof candidate === "string" && candidate.trim()) {
      scalarPatch[field] = candidate.trim();
    }
  }

  const replaceFields = Array.isArray(source.replace_fields)
    ? source.replace_fields
        .filter((field): field is string => typeof field === "string")
        .map((field) => field.trim())
        .filter(isConfirmedRequirementField)
    : [];

  const confidence =
    source.confidence === "low" || source.confidence === "medium" || source.confidence === "high"
      ? source.confidence
      : undefined;
  const notes = normalizeStringArray(source.notes);

  if (!Object.keys(confirmedPatch).length && !replaceFields.length && !notes?.length) {
    return undefined;
  }

  return {
    confirmed_patch: confirmedPatch,
    replace_fields: replaceFields,
    confidence,
    notes,
  };
}

function mergeReasoningPatch(
  base: ConfirmedRequirement,
  patch?: IntakeReasoningPatch,
) {
  if (!patch?.confirmed_patch) return base;

  const replaceFields = new Set<keyof ConfirmedRequirement>(patch.replace_fields ?? []);
  const merged = { ...base };
  const scalarMerged = merged as Record<string, string | undefined>;
  const arrayMerged = merged as Record<string, string[] | undefined>;
  const scalarPatch = patch.confirmed_patch as Record<string, string | undefined>;
  const arrayPatch = patch.confirmed_patch as Record<string, string[] | undefined>;

  for (const field of SCALAR_REQUIREMENT_FIELDS) {
    const candidate = scalarPatch[field];
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    scalarMerged[field] = replaceFields.has(field)
      ? candidate.trim()
      : (scalarMerged[field] ?? candidate.trim());
  }

  for (const field of ARRAY_REQUIREMENT_FIELDS) {
    const candidate = arrayPatch[field];
    if (!Array.isArray(candidate) || !candidate.length) continue;
    arrayMerged[field] = (
      replaceFields.has(field)
        ? unique(candidate)
        : mergeArrays(arrayMerged[field], candidate)
    );
  }

  return merged;
}

function canUseReasoningModel() {
  return Boolean(process.env.SECONDME_INTAKE_REASONING_MODEL);
}

function buildReasoningTrace(
  patch: IntakeReasoningPatch | undefined,
): IntakeReasoningTrace | undefined {
  if (!canUseReasoningModel()) {
    return undefined;
  }

  const appliedFields = Object.keys(patch?.confirmed_patch ?? {}).filter(
    isConfirmedRequirementField,
  );
  const replacedFields = (patch?.replace_fields ?? []).filter(isConfirmedRequirementField);

  return {
    enabled: true,
    confidence: patch?.confidence,
    applied_fields: appliedFields,
    replaced_fields: replacedFields,
    notes: patch?.notes ?? [],
  };
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

function extractRecentAssistantQuestion(history: ConversationTurn[] = []) {
  return [...history]
    .reverse()
    .find((turn) => turn.role === "assistant" && /[？?]/.test(turn.content))
    ?.content;
}

function extractCorrectionReplacementText(message: string) {
  const patterns = [
    /不是.*?而是(.+)/,
    /不是.*?[，, ]?是(.+)/,
    /改成(.+)/,
    /换成(.+)/,
    /应该是(.+)/,
    /准确地说(.+)/,
    /我说的是(.+)/,
  ];

  for (const pattern of patterns) {
    const matched = message.match(pattern);
    if (matched?.[1]?.trim()) {
      return matched[1].trim();
    }
  }

  return undefined;
}

function extractDeviceMentions(text?: string) {
  if (!text) return [];

  return unique(
    collectKeywords(text, [
      [/(电视|tv)/i, "电视"],
      [/(空调)/, "空调"],
      [/(智能灯|灯光|灯)/, "智能灯"],
      [/(投影|投影仪)/, "投影仪"],
      [/(风扇)/, "风扇"],
      [/(机顶盒)/, "机顶盒"],
    ]),
  );
}

function extractButtonPreferences(text?: string) {
  if (!text) return [];

  return unique(
    collectKeywords(text, [
      [/(电源|开关机)/, "电源键"],
      [/(音量)/, "音量键"],
      [/(切换|模式|频道)/, "切换键"],
      [/(返回)/, "返回键"],
      [/(主页|home)/i, "主页键"],
      [/(确认|ok)/i, "确认键"],
      [/(方向|上下左右)/, "方向键"],
    ]),
  );
}

function sanitizeButtonPreferences(
  preferences: string[],
  text?: string,
) {
  if (!preferences.length) return preferences;

  const hasDirectionalButtonIntent = Boolean(
    text &&
      (/(方向键)/.test(text) || /(上下左右)/.test(text)),
  );

  if (hasDirectionalButtonIntent) {
    return preferences;
  }

  return preferences.filter((item) => item !== "方向键");
}

function inferTargetUsers(message: string) {
  if (hasPattern(message, [/(自己用|我自己用|个人使用)/])) return "个人用户";
  if (hasPattern(message, [/(家人|全家|家里人)/])) return "家庭成员";
  if (hasPattern(message, [/(团队|同事|办公室)/])) return "团队内部";
  return undefined;
}

function inferBroadTargetDevices(message: string, recentQuestion?: string) {
  const isTargetDeviceThread = Boolean(
    recentQuestion &&
      /(\u63a7\u5236\u54ea\u4e9b\u5bb6\u7535|\u63a7\u5236\u54ea\u4e9b\u8bbe\u5907|\u7535\u89c6|\u7a7a\u8c03|\u6295\u5f71|\u98ce\u6247|\u673a\u9876\u76d2|\u5bb6\u7535)/.test(
        recentQuestion,
      ),
  );

  if (
    isTargetDeviceThread &&
    /(\u5168\u9762\u4e00\u70b9|\u8986\u76d6\u5168\u9762|\u8986\u76d6\u66f4\u5168|\u8986\u76d6\u5bb6\u91cc\u5e38\u7528|\u5e38\u7528\u5bb6\u7535\u90fd\u60f3\u5e26\u4e0a|\u5bb6\u91cc\u5e38\u7528\u7684\u90fd\u60f3\u63a7\u5236|\u5c3d\u91cf\u90fd\u80fd\u63a7\u5236)/.test(
      message,
    )
  ) {
    return ["\u5e38\u7528\u5bb6\u7535"];
  }

  return [];
}

function inferUseCaseFromTargetDevices(targetDevices: string[]) {
  if (!targetDevices.length) return undefined;
  if (targetDevices.includes("\u5e38\u7528\u5bb6\u7535")) return "\u63a7\u5236\u5bb6\u4e2d\u5e38\u7528\u5bb6\u7535";
  return `控制${targetDevices.join("、")}等常见家电`;
}

function inferPortability(message: string) {
  if (hasPattern(message, [/(放在茶几|放家里|桌上|客厅)/])) return "居家常驻，偶尔手持";
  if (hasPattern(message, [/(卧室|书房|几个房间|到处拿|随手拿|偶尔拿起来)/])) {
    return "室内多房间移动使用";
  }
  if (hasPattern(message, [/(随身带|揣口袋|便携|出差)/])) return "便携随身";
  return undefined;
}

function inferPlacement(message: string) {
  if (hasPattern(message, [/(茶几)/])) return "茶几";
  if (hasPattern(message, [/(卧室)/])) return "卧室";
  if (hasPattern(message, [/(书房)/])) return "书房";
  if (hasPattern(message, [/(客厅)/])) return "客厅";
  return undefined;
}

function inferScreenSizePreference(message: string, recentQuestion?: string) {
  if (hasPattern(message, [/(比手表大)/])) return "比智能手表更大";
  if (hasPattern(message, [/(名片|卡片)/])) return "名片大小";
  if (hasPattern(message, [/(小屏|小一点)/])) return "偏小屏";
  if (hasPattern(message, [/(大一点|大屏)/])) return "偏大屏";
  if (
    recentQuestion &&
    /(屏幕.*多大|多大.*屏幕|尺寸范围|大概多大)/.test(recentQuestion) &&
    hasPattern(message, [/(你来决定|你定吧|你帮我定|没有尺寸范围|没有整个尺寸范围|没概念)/])
  ) {
    return "由系统按传统遥控器比例默认";
  }
  return undefined;
}

function inferInteractionLayout(message: string) {
  if (hasPattern(message, [/(放在屏幕旁边|屏幕旁边|并排)/])) return "屏幕与按键并排";
  if (hasPattern(message, [/(屏幕上方|按键下方|上面是屏幕下面是按键)/])) return "屏幕在上，按键在下";
  if (hasPattern(message, [/(屏幕下方|按键上方)/])) return "按键在上，屏幕在下";
  return undefined;
}

function inferSizePreference(message: string, recentQuestion?: string) {
  if (hasPattern(message, [/(更小巧|小巧一点|更小一点)/])) return "比传统遥控器更小巧";
  if (hasPattern(message, [/(比遥控器稍微短一点|比传统遥控器再短一点)/])) {
    return "比传统遥控器稍短";
  }
  if (
    recentQuestion &&
    /(多大|尺寸|大小|宽|长条形)/.test(recentQuestion) &&
    hasPattern(message, [/(你来决定|你定吧|你帮我定|没有尺寸范围|没有整个尺寸范围|没概念)/])
  ) {
    return "由系统按传统遥控器默认比例决定";
  }
  return undefined;
}

function mergeContextualAnswer(args: {
  message: string;
  current: ConfirmedRequirement;
  recentQuestion?: string;
  shouldReplace?: boolean;
}) {
  const targetDevicesFromMessage = extractDeviceMentions(args.message);
  const broadTargetDevices = inferBroadTargetDevices(args.message, args.recentQuestion);
  const targetDevicesFromQuestion =
    hasPattern(args.message, [/(这些都要|都要|都包括|都可以)/]) &&
    args.recentQuestion &&
    /(电视|空调|智能灯|投影|风扇|机顶盒)/.test(args.recentQuestion)
      ? extractDeviceMentions(args.recentQuestion)
      : [];

  const buttonPreferencesFromMessage = extractButtonPreferences(args.message);
  const buttonPreferencesFromQuestion =
    hasPattern(args.message, [/(这些按键|这些案件|保留这些物理按键|保留这些按键|几个功能键|常见几个功能)/]) &&
    args.recentQuestion
      ? extractButtonPreferences(args.recentQuestion)
      : [];
  const normalizedButtonPreferences = sanitizeButtonPreferences(
    unique([...buttonPreferencesFromMessage, ...buttonPreferencesFromQuestion]),
    [args.message, args.recentQuestion].filter(Boolean).join(" "),
  );

  const useCaseFromDevices = inferUseCaseFromTargetDevices([
    ...targetDevicesFromMessage,
    ...broadTargetDevices,
    ...targetDevicesFromQuestion,
  ]);

  const delegatedSizePreference = inferSizePreference(args.message, args.recentQuestion);
  const delegatedScreenSizePreference = inferScreenSizePreference(
    args.message,
    args.recentQuestion,
  );

  return {
    target_devices: mergeOrReplaceArrays(
      args.current.target_devices,
      unique([...targetDevicesFromMessage, ...broadTargetDevices, ...targetDevicesFromQuestion]),
      Boolean(args.shouldReplace),
    ),
    button_preferences: mergeOrReplaceArrays(
      args.current.button_preferences,
      normalizedButtonPreferences,
      Boolean(args.shouldReplace),
    ),
    interaction_layout: preferOverride(
      args.current.interaction_layout,
      inferInteractionLayout(args.message),
      Boolean(args.shouldReplace),
    ),
    placement: preferOverride(
      args.current.placement,
      inferPlacement(args.message),
      Boolean(args.shouldReplace),
    ),
    portability: preferOverride(
      args.current.portability,
      inferPortability(args.message),
      Boolean(args.shouldReplace),
    ),
    use_case: preferOverride(args.current.use_case, useCaseFromDevices, Boolean(args.shouldReplace)),
    size: preferOverride(args.current.size, delegatedSizePreference, Boolean(args.shouldReplace)),
    screen_size_preference: preferOverride(
      args.current.screen_size_preference,
      delegatedScreenSizePreference,
      Boolean(args.shouldReplace),
    ),
    target_users: preferOverride(
      args.current.target_users,
      inferTargetUsers(args.message),
      Boolean(args.shouldReplace),
    ),
  } satisfies Partial<ConfirmedRequirement>;
}

function deriveConfirmed(
  message: string,
  current: ConfirmedRequirement,
  history: ConversationTurn[] = [],
): ConfirmedRequirement {
  const signals = parseConversationSignals(message);
  const replacementText = signals.isCorrection ? extractCorrectionReplacementText(message) : undefined;
  const extractionText = replacementText ?? message;
  const connectivity = collectKeywords(extractionText, [
    [/蓝牙/i, "蓝牙"],
    [/(wi-?fi|wifi)/i, "Wi-Fi"],
    [/(4g|lte)/i, "4G"],
    [/gps/i, "GPS"],
  ]);
  const sensors = collectKeywords(extractionText, [
    [/imu/i, "IMU"],
    [/温度/, "温度传感器"],
    [/湿度/, "湿度传感器"],
    [/压力/, "压力传感器"],
    [/(摄像头|相机)/, "摄像头"],
    [/麦克风/, "麦克风"],
  ]);
  const controls = collectKeywords(extractionText, [
    [/(按钮|按键)/, "按钮"],
    [/旋钮/, "旋钮"],
    [/(触控|触摸|触屏)/, "触控"],
    [/语音/, "语音"],
  ]);
  const ports = collectKeywords(extractionText, [
    [/(usb-?c|type-?c)/i, "USB-C"],
    [/(音频|耳机)/, "音频口"],
    [/(电源口|dc)/i, "电源口"],
    [/(网口|rj45)/i, "RJ45"],
  ]);
  const power = collectKeywords(extractionText, [
    [/(电池|充电)/, "电池供电"],
    [/(外接供电|适配器)/, "外接供电"],
  ]);
  const targetDevicesFromText = extractDeviceMentions(extractionText);
  const buttonPreferencesFromText = extractButtonPreferences(extractionText);
  const coreFeatures = collectKeywords(extractionText, [
    [/(显示|屏幕)/, "显示"],
    [/(遥控|红外)/, "红外控制"],
    [/(监测|检测|采集)/, "数据采集"],
    [/(联网|连接|同步手机)/, "无线连接"],
    [/(播放|音频|音响)/, "音频播放"],
    [/(运动|记录运动数据)/, "运动记录"],
  ]);

  const normalizedMessage = message.replace(/\s+/g, "");
  const recentQuestion = extractRecentAssistantQuestion(history);
  const useCase =
    current.use_case ??
    extractionText.match(/用于([^，。；]+)/)?.[1]?.trim() ??
    extractionText.match(/给([^，。；]+)用/)?.[1]?.trim() ??
    (hasPattern(normalizedMessage, [/(家里用|家用|家庭用)/]) ? "家庭环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(出门用|外出用|随身用|在外面用)/]) ? "外出环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(酒店|宾馆|民宿)/]) ? "酒店环境" : undefined) ??
    (hasPattern(normalizedMessage, [/(办公室|办公桌|工位)/]) ? "办公环境" : undefined);
  const contextualAnswer = mergeContextualAnswer({
    message: extractionText,
    current,
    recentQuestion,
    shouldReplace: signals.isCorrection,
  });
  const screenCandidate =
    hasPattern(extractionText, [/(屏幕|显示|触控|触摸|触屏)/])
      ? hasPattern(extractionText, [/(触控|触摸|触屏)/])
        ? "触控屏"
        : "显示屏"
      : undefined;
  const normalizedControls =
    screenCandidate === "触控屏" ? mergeArrays(controls, ["触控"]) : controls;

  const provisionalRequirement = {
    ...current,
    use_case: contextualAnswer.use_case ?? useCase,
    target_users: contextualAnswer.target_users ?? current.target_users,
    target_devices: contextualAnswer.target_devices,
    screen: preferOverride(current.screen, screenCandidate, signals.isCorrection),
    screen_size_preference: contextualAnswer.screen_size_preference,
    controls: mergeOrReplaceArrays(current.controls, normalizedControls, signals.isCorrection),
    button_preferences: contextualAnswer.button_preferences,
    interaction_layout: contextualAnswer.interaction_layout,
    sensors: mergeOrReplaceArrays(current.sensors, sensors, signals.isCorrection),
    connectivity: mergeOrReplaceArrays(current.connectivity, connectivity, signals.isCorrection),
    ports: mergeOrReplaceArrays(current.ports, ports, signals.isCorrection),
    power: mergeOrReplaceArrays(current.power, power, signals.isCorrection),
    core_features: mergeArrays(
      current.core_features,
      targetDevicesFromText.length ? [...coreFeatures, "红外控制"] : coreFeatures,
    ),
    size: preferOverride(
      current.size,
      extractApproxSize(extractionText) ?? contextualAnswer.size,
      signals.isCorrection,
    ),
    placement: contextualAnswer.placement,
    portability: contextualAnswer.portability,
  } satisfies ConfirmedRequirement;

  const explicitDeviceType = inferDeviceType(extractionText);
  const inferredDeviceType =
    explicitDeviceType ??
    inferDeviceTypeFromArchetype({
      message: extractionText,
      confirmed: provisionalRequirement,
    });
  const hasFreshArchetypeEvidence = Boolean(
    explicitDeviceType ||
      targetDevicesFromText.length ||
      buttonPreferencesFromText.length ||
      hasPattern(extractionText, [
        /(拿在手里|握在手里|随身带着|手持|便携)/,
        /(放桌上|桌面上|办公桌|书桌|床头柜|茶几上)/,
        /(戴在手上|戴在手腕|穿戴|表带)/,
        /(控制电视|控制空调|控制投影|控制灯|控制风扇)/,
        /(音箱|扬声器|听歌|播歌|外放)/,
      ]),
  );

  return {
    ...provisionalRequirement,
    device_type: signals.isCorrection
      ? inferredDeviceType ?? current.device_type
      : explicitDeviceType ??
        (hasFreshArchetypeEvidence ? inferredDeviceType : current.device_type) ??
        inferredDeviceType,
  };
}

function computeUnknowns(confirmed: ConfirmedRequirement) {
  const unknowns: string[] = [];
  if (!confirmed.device_type) unknowns.push("设备类型");
  if (!confirmed.use_case) unknowns.push("使用场景");
  if (confirmed.device_type === "红外遥控器" && !confirmed.target_devices?.length) {
    unknowns.push("控制对象");
  }
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
  if (confirmed.device_type === "红外遥控器" && !confirmed.target_devices?.length) {
    missing.push("控制对象");
  }
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
  if (!confirmed.screen_size_preference && confirmed.screen) {
    assumptions.push("未提供屏幕尺寸偏好，将按设备常见比例默认");
  }
  if (!confirmed.interaction_layout && confirmed.screen && confirmed.controls?.length) {
    assumptions.push("未提供屏幕与按键布局，将默认使用屏幕在上、按键在下");
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
  const shellSize = { ...base.shellSize };
  let boardGrid = { cols: base.cols, rows: base.rows };

  if (confirmed.screen) {
    assumptions.push("默认屏幕位于前壳");
  }

  if (confirmed.device_type === "红外遥控器") {
    if (confirmed.screen_size_preference === "比智能手表更大") {
      shellSize.width += 4;
      shellSize.height += 6;
      assumptions.push("按更大的屏幕偏好，机身正面做了加宽加长");
    } else if (confirmed.screen_size_preference === "名片大小") {
      shellSize.width += 8;
      shellSize.height = Math.max(shellSize.height - 10, 132);
      assumptions.push("按名片级屏幕偏好，机身改成更扁宽的比例");
    }

    if (confirmed.interaction_layout === "屏幕与按键并排") {
      shellSize.width += 14;
      shellSize.height = Math.max(shellSize.height - 18, 126);
      boardGrid = { cols: base.cols + 1, rows: base.rows };
      assumptions.push("按屏幕与按键并排布局，正面改成更宽的横向排布");
    }

    if (confirmed.portability === "居家常驻，偶尔手持") {
      shellSize.depth += 2;
      assumptions.push("按居家常驻场景，内部给电池和握持厚度留了更多余量");
    } else if (confirmed.portability === "便携随身") {
      shellSize.height = Math.max(shellSize.height - 14, 120);
      shellSize.depth = Math.max(shellSize.depth - 2, 14);
      assumptions.push("按随身便携方向，机身被收紧成更短更薄的比例");
    }
  }

  const useHighCore =
    Boolean(confirmed.screen) ||
    (confirmed.connectivity?.length ?? 0) > 0 ||
    (confirmed.sensors?.length ?? 0) > 0;
  modules.push(useHighCore ? "esp32_s3" : "esp32");
  assumptions.push(`默认使用 ${useHighCore ? "ESP32-S3" : "ESP32"} 作为主控`);

  if (confirmed.power?.includes("电池供电")) {
    modules.push({
      id: "battery",
      sizeOverride:
        confirmed.portability === "居家常驻，偶尔手持"
          ? { width: 30, height: 12, depth: 16 }
          : confirmed.portability === "便携随身"
            ? { width: 22, height: 9, depth: 12 }
            : { width: 26, height: 10, depth: 14 },
    });
  }
  if (confirmed.connectivity?.includes("蓝牙")) modules.push("bluetooth");
  if (confirmed.connectivity?.includes("Wi-Fi")) modules.push("wifi");
  if (confirmed.connectivity?.includes("GPS")) modules.push("gps");
  if (confirmed.sensors?.includes("IMU")) modules.push("imu_sensor");
  if (confirmed.sensors?.includes("摄像头")) modules.push("camera_module");
  if (confirmed.sensors?.includes("麦克风")) modules.push("microphone_array");

  if (confirmed.controls?.includes("按钮")) {
    modules.push({
      id: "button_array",
      sizeOverride:
        confirmed.button_preferences?.length && confirmed.button_preferences.length >= 3
          ? { width: 28, height: 10, depth: 14 }
          : { width: 20, height: 8, depth: 12 },
    });
    ports.push({
      face: confirmed.device_type === "红外遥控器" ? "front" : "left",
      type: "button_cutout",
      sizeMm:
        confirmed.interaction_layout === "屏幕与按键并排"
          ? { width: 12, height: 24, depth: 4 }
          : confirmed.button_preferences?.length && confirmed.button_preferences.length >= 3
            ? { width: 10, height: 18, depth: 4 }
            : { width: 8, height: 8, depth: 4 },
    });
    assumptions.push(
      confirmed.button_preferences?.length
        ? `正面按键区按 ${confirmed.button_preferences.join("、")} 这组常用功能键预留`
        : "正面按键区按常用功能键做了基础预留",
    );
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
    shellSize,
    board: {
      placement: "center",
      grid: boardGrid,
    },
    mainScreen: confirmed.screen
        ? {
          face: "front",
          type: confirmed.screen.includes("触控") ? "touch_display" : "display_panel",
          sizeMm:
            confirmed.device_type === "红外遥控器" &&
            confirmed.screen_size_preference === "比智能手表更大"
              ? { width: 30, height: 78, depth: 4 }
              : confirmed.device_type === "红外遥控器" &&
                confirmed.screen_size_preference === "名片大小"
                ? { width: 38, height: 62, depth: 4 }
              : confirmed.device_type === "红外遥控器"
              ? { width: 22, height: 68, depth: 4 }
              : confirmed.device_type === "智能手表"
                ? { width: 30, height: 34, depth: 3 }
                : { width: 40, height: 60, depth: 4 },
        }
      : undefined,
    ports: ports.length ? ports : undefined,
    modules: uniqueModules(modules),
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
  reasoningTrace: IntakeReasoningTrace | undefined,
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
    target_devices: confirmed.target_devices,
    core_features: confirmed.core_features?.length
      ? confirmed.core_features
      : ["基于当前已确认硬件要素生成初步方案"],
    hardware_requirements: {
      screen: confirmed.screen,
      controls: confirmed.controls,
      screen_size_preference: confirmed.screen_size_preference,
      button_preferences: confirmed.button_preferences,
      interaction_layout: confirmed.interaction_layout,
      sensors: confirmed.sensors,
      audio: confirmed.audio,
      connectivity: confirmed.connectivity,
      power: confirmed.power,
      ports: confirmed.ports,
    },
    constraints: {
      size: confirmed.size,
      placement: confirmed.placement,
      portability: confirmed.portability,
      budget: confirmed.budget,
      timeline: confirmed.timeline,
      environment: confirmed.environment,
    },
    references: confirmed.references ?? [],
    unknowns,
    risks,
    reasoning_trace: reasoningTrace,
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
    confirmed.screen_size_preference ? `屏幕偏好：${confirmed.screen_size_preference}` : undefined,
    confirmed.controls?.length ? `交互：${confirmed.controls.join("、")}` : undefined,
    confirmed.button_preferences?.length ? `按键：${confirmed.button_preferences.join("、")}` : undefined,
    confirmed.interaction_layout ? `布局：${confirmed.interaction_layout}` : undefined,
    confirmed.target_devices?.length ? `控制对象：${confirmed.target_devices.join("、")}` : undefined,
    confirmed.sensors?.length ? `传感器：${confirmed.sensors.join("、")}` : undefined,
    confirmed.connectivity?.length
      ? `连接：${confirmed.connectivity.join("、")}`
      : undefined,
    confirmed.power?.length ? `供电：${confirmed.power.join("、")}` : undefined,
    confirmed.portability ? `移动方式：${confirmed.portability}` : undefined,
  ]
    .filter(Boolean)
    .join("；");
}

function buildNextStepQuestion(unknowns: string[] = [], preferredFocus?: string) {
  const focus = preferredFocus ?? unknowns[0];

  switch (focus) {
    case "核心功能":
      return "我想先把它最核心的那一两件事收准。你更希望它偏控制、显示状态，还是采集数据这类功能？";
    case "控制对象":
      return "我再补最后一个关键点：它现在最常控制的是电视、空调，还是像灯光这类设备也要一起带上？";
    case "使用场景":
      return "我还想确认一下使用场景。它主要是固定放家里用，还是会在几个房间之间经常拿着走？";
    case "主要交互方式":
    case "按键或触屏交互":
      return "我想先把交互定准一点。你更希望它主要靠触屏，还是保留一组顺手的物理按键？";
    case "供电方式":
      return "接下来我只想补一下供电。你更想要内置电池充电，还是更换电池这种更省心的方案？";
    case "连接方式":
      return "连接这块我也想先收一下。你更偏向蓝牙、Wi-Fi，还是先不急着上无线？";
    case "接口需求":
      return "接口这块我想先问准一点。你是只要一个 USB-C 就够，还是还想留音频口、扩展口这类接口？";
    case "尺寸与外形":
      return "尺寸这块你如果没有特别限制也没关系，我可以先按常见遥控器比例给你出一版。";
    default:
      return undefined;
  }
}

function buildPendingDetailAnswer(unknowns: string[] = []) {
  const focus = unknowns[0];

  switch (focus) {
    case "按键或触屏交互":
    case "主要交互方式":
      return "现在还差的这个小细节，主要是想帮你把交互定死一点。比如这块屏幕是只显示状态，还是也想顺手做成可触控；旁边那几个按键又更偏向电源、音量、切换这类常用键。";
    case "控制对象":
      return "现在差的这个小细节，是想把控制对象再收准一点。比如除了空调、电视，是不是还想顺手带上灯光、投影仪或者别的家电。";
    case "尺寸与外形":
      return "现在差的这个小细节，是想把尺寸和外形收得更稳一点。比如做成更像传统遥控器，还是更短更宽、偏触屏设备的手感。";
    case "供电方式":
      return "现在差的这个小细节，是想把供电方式定下来。比如是内置电池加 USB-C 充电，还是更换电池那种更省心的方向。";
    default:
      return "现在还差的是最后一个很小的落地细节，我是想帮你把方案收得更稳一点，再出图会更像你真正想要的样子。";
  }
}

function isLightAcknowledgementMessage(message: string) {
  return /^(谢谢(你|啦)?|多谢(你)?|明白了|好的(呀|哦)?|好呀|好哦|嗯|嗯嗯|收到|知道了)[！!。.]?$/i.test(
    message.trim(),
  );
}

function buildLightAcknowledgementReply(args: {
  previewDraft?: PreviewDraft;
  unknowns: string[];
}) {
  if (args.previewDraft && args.unknowns.length <= 1) {
    return "好呀，我就顺着这个方向继续替你收着。其实已经能先摆一版结构出来了，你点头的话我就把预览起出来。";
  }

  if (args.unknowns.length) {
    return `好呀，我先把这条替你记住。后面我们就顺着把${args.unknowns[0]}收稳一点，整个方案会更顺。`;
  }

  return "好呀，我先接住这一条。你想继续往下补细节，或者让我先替你收一收当前方向，都可以。";

  if (args.previewDraft && args.unknowns.length <= 1) {
    return "好呀，那我这边就顺着这个方向继续收着。现在其实已经很接近可以出预览了，你想看的话我就直接给你起一版。";
  }

  if (args.unknowns.length) {
    return `好呀，我先替你把这条记住。后面我们就顺着把${args.unknowns[0]}补一下，整个方案会更稳。`;
  }

  return "好呀，我先接住这条。你想继续往下补细节，或者让我先帮你收一收当前方向，都可以。";
}

function replyStillAsksResolvedFocus(args: {
  reply: string;
  focus?: string;
  confirmed: ConfirmedRequirement;
}) {
  const { reply, focus, confirmed } = args;
  if (!focus) return false;

  switch (focus) {
    case "使用场景":
      return Boolean(confirmed.use_case) && /(场景|家里用|外出用|放在家里|随身带)/.test(reply);
    case "供电方式":
      return Boolean(confirmed.power?.length) && /(供电|电池|充电|USB-C|type-c)/i.test(reply);
    case "控制对象":
      return Boolean(confirmed.target_devices?.length) && /(电视|空调|智能灯|控制哪些设备)/.test(reply);
    case "按键或触屏交互":
    case "主要交互方式":
      return Boolean(confirmed.screen || confirmed.controls?.length) && /(按键|触屏|交互)/.test(reply);
    case "尺寸与外形":
      return Boolean(confirmed.size || confirmed.screen_size_preference) && /(尺寸|多大|大一点|小巧|手表大)/.test(reply);
    default:
      return false;
  }
}

function replyMatchesExpectedFocus(reply: string, focus?: string) {
  if (!focus) return true;

  switch (focus) {
    case "\u4f7f\u7528\u573a\u666f":
      return /(\u573a\u666f|\u5ba2\u5385|\u5367\u5ba4|\u684c\u4e0a|\u51fa\u95e8|\u968f\u8eab|\u5bb6\u91cc\u7528|\u653e\u54ea|\u5728\u54ea\u7528)/.test(reply);
    case "\u4f9b\u7535\u65b9\u5f0f":
      return /(\u4f9b\u7535|\u7535\u6c60|\u5145\u7535|USB-C|Type-C|\u66f4\u6362\u7535\u6c60|\u5185\u7f6e\u7535\u6c60)/i.test(reply);
    case "\u63a7\u5236\u5bf9\u8c61":
      return /(\u7535\u89c6|\u6295\u5f71|\u7a7a\u8c03|\u706f\u5149|\u63a7\u5236\u54ea\u4e9b|\u5bf9\u8c61|\u5bb6\u7535)/.test(reply);
    case "\u6838\u5fc3\u529f\u80fd":
      return /(\u529f\u80fd|\u4e3b\u8981\u505a\u4ec0\u4e48|\u63a7\u5236|\u663e\u793a|\u91c7\u96c6|\u63d0\u9192|\u64ad\u653e)/.test(reply);
    case "\u4e3b\u8981\u4ea4\u4e92\u65b9\u5f0f":
    case "\u6309\u952e\u6216\u89e6\u5c4f\u4ea4\u4e92":
      return /(\u6309\u952e|\u5b9e\u4f53\u952e|\u89e6\u5c4f|\u4ea4\u4e92|\u65cb\u94ae|\u5c4f\u5e55)/.test(reply);
    case "\u5c3a\u5bf8\u4e0e\u5916\u5f62":
      return /(\u5c3a\u5bf8|\u5916\u5f62|\u624b\u611f|\u6bd4\u4f8b|\u5927\u5c0f|\u8584\u539a|\u957f\u77ed|\u5bbd\u7a84)/.test(reply);
    case "\u63a5\u53e3\u9700\u6c42":
      return /(\u63a5\u53e3|USB|Type-C|\u97f3\u9891\u53e3|\u6269\u5c55\u53e3|\u63d2\u53e3)/i.test(reply);
    case "\u8fde\u63a5\u65b9\u5f0f":
      return /(\u84dd\u7259|Wi-?Fi|\u65e0\u7ebf|\u8fde\u63a5|\u914d\u7f51|\u7ec4\u7f51)/i.test(reply);
    case "\u8bbe\u5907\u7c7b\u578b":
      return /(\u9065\u63a7\u5668|\u624b\u6301|\u684c\u9762|\u7a7f\u6234|\u5f62\u6001|\u8bbe\u5907)/.test(reply);
    default:
      return true;
  }
}

function replyLooksLikeQuestion(reply: string) {
  return /[\uff1f?]/.test(reply) || /(\u8fd8\u662f|\u66f4\u504f|\u8981\u4e0d\u8981|\u5e0c\u671b|\u60f3|\u5148\u8865|\u518d\u786e\u8ba4|\u95ee\u4e00\u4e0b)/.test(reply);
}

function applyReplyGuard(args: {
  message: string;
  reply: string;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  nextAction: string;
  previewDraft?: PreviewDraft;
  workflowState?: IntakeAgentState["workflow_state"];
  handoffCandidate?: LabHandoff;
  focus?: string;
  transitionMode?: string;
}) {
  const summary = buildRequirementSummary(args.confirmed);

  if (isLightAcknowledgementMessage(args.message)) {
    return buildLightAcknowledgementReply({
      previewDraft: args.previewDraft,
      unknowns: args.unknowns,
    });
  }

  if (/(什么细节|哪个细节|补什么|还差什么|差什么|细节是什么)/.test(args.message)) {
    return buildPendingDetailAnswer(args.unknowns);
  }

  if (args.nextAction === "generate_preview" && args.previewDraft) {
    return summary
      ? "好呀，我先把我们刚刚聊出来的方向摆成一版 3D 草案了。主舞台已经切到新方案，你可以直接看看结构顺不顺眼。"
      : "好呀，我先把 3D 草案摆出来了。你可以先看看主舞台里的结构方向顺不顺眼。";
  }

  if (args.nextAction === "prepare_handoff" || args.nextAction === "handoff_to_lab") {
    return args.unknowns?.length
      ? `我先把能交给实验室的主体内容拢成一版了，像${args.unknowns.slice(0, 2).join("、")}这些小口子后面还能继续补，不过现在已经可以先开交接单。`
      : "我先把这轮要交给实验室的内容收成一版了，你可以直接打开交接单看看。";
  }

  if (args.workflowState === "handoff_ready" && args.handoffCandidate) {
    return args.unknowns?.length
      ? `我这边已经能先替你收一版交接内容了，像${args.unknowns.slice(0, 2).join("、")}这些小口子后面还能继续补。你要是愿意，我现在就把 handoff 摆给你看。`
      : "我这边已经能把交接内容替你收成一版了。你要是愿意，我现在就把 handoff 摆给你看。";
  }

  if (args.previewDraft && !(args.unknowns?.length)) {
    return "我这边已经把一版结构方向替你收出来了。你要是愿意，我现在就直接给你起一个 3D 预览。";
  }

  if (args.nextAction === "generate_preview" && args.previewDraft) {
    if (/[锛?]/.test(args.reply) || /(瑕佷笉瑕亅鏄惁|鍙互.*鐢熸垚|缁欎綘鐪嬫劅鍙梶鐪嬬湅鎰熻)/.test(args.reply)) {
      return "好呀，我已经把刚才聊出来的方向先摆成一版 3D 草案了。你现在可以直接看看主舞台里的结构感觉，如果想调布局或尺寸，我们再顺着往下改。";
    }
  }

  if (args.nextAction === "prepare_handoff") {
    if (/[锛?]/.test(args.reply) || /(瑕佷笉瑕亅鏄惁|鍙互.*鏁寸悊|瑕佷笉瑕佹垜鏁寸悊)/.test(args.reply)) {
      return "我已经把这轮能交给实验室的内容先收成一版了。你可以直接看交接单，如果还想补几个细节，我们也能继续往里添。";
    }
  }

  if (args.nextAction === "generate_preview") {
    if (/[？?]/.test(args.reply) || /(要不要|是否|可以.*生成|给你看感受|看看感觉)/.test(args.reply)) {
      return args.previewDraft
        ? "好呀，我已经按我们刚刚收好的方向把 3D 草案立起来了。你现在可以直接看主舞台里的结构预览，如果想调布局或尺寸，我们再继续改。"
        : "好呀，我现在就按我们刚刚收好的方向生成 3D 草案。";
    }
    return args.reply;
  }

  if (args.nextAction === "prepare_handoff") {
    if (/[？?]/.test(args.reply) || /(要不要|是否|可以.*整理|要不要我整理)/.test(args.reply)) {
      return "我已经把可以交给实验室的内容整理好了。你可以直接看交接单，如果还想补几个细节，我们也可以继续补。";
    }
    return args.reply;
  }

  if (replyStillAsksResolvedFocus({
    reply: args.reply,
    focus: args.focus,
    confirmed: args.confirmed,
  })) {
    if (args.previewDraft && args.unknowns.length <= 1) {
      return "我这边已经把关键方向收得差不多了，完全可以先替你摆一版 3D 草案；你要是想更稳一点，我们也可以先把最后那个小口子补上。";
    }

    if (args.previewDraft && args.unknowns.length <= 1) {
      return "我这边已经把关键方向收得差不多了，可以先给你出一版 3D 草案；如果你愿意，我们也可以在出图前再补最后一个小细节。";
    }

    return (
      buildNextStepQuestion(args.unknowns, args.focus) ??
      "我先把刚才那条信息记住了，我们继续往下补最后几个关键点。"
    );
  }

  if (
    args.transitionMode === "soft_clarify" &&
    args.focus &&
    replyLooksLikeQuestion(args.reply) &&
    !replyMatchesExpectedFocus(args.reply, args.focus)
  ) {
    return (
      buildNextStepQuestion(args.unknowns, args.focus) ??
      "\u6211\u5148\u628a\u521a\u624d\u8fd9\u6761\u4fe1\u606f\u6536\u4f4f\uff0c\u6211\u4eec\u7ee7\u7eed\u987a\u7740\u6700\u5173\u952e\u7684\u4e00\u4e2a\u70b9\u5f80\u4e0b\u804a\u5c31\u597d\u3002"
    );
  }

  return args.reply;
}

function buildFallbackCustomerReply(args: {
  message?: string;
  confirmed: ConfirmedRequirement;
  workflowState: IntakeAgentState["workflow_state"];
  nextAction: string;
  previewDraft?: PreviewDraft;
  handoffCandidate?: LabHandoff;
  unknowns?: string[];
  suggestions?: string[];
  recommendationCards?: IntakeSuggestion[];
  orchestration?: ReplyOrchestration;
}) {
  const summary = buildRequirementSummary(args.confirmed);
  const focus = args.orchestration?.singleFocus ?? args.unknowns?.[0];
  const baseMode = args.message ? detectConversationBaseMode(args.message) : "none";

  if (args.nextAction === "prepare_handoff" || args.nextAction === "handoff_to_lab") {
    return args.unknowns?.length
      ? `我先把能交给实验室的主体内容拢成一版了，像${args.unknowns.slice(0, 2).join("、")}这些小口子后面还能继续补，不过现在已经可以先开交接单。`
      : "我先把这轮要交给实验室的内容收成一版了，你可以直接打开交接单看看。";
  }

  if (args.workflowState === "handoff_ready" && args.handoffCandidate) {
    return args.unknowns?.length
      ? `我这边已经能先替你收一版交接内容了，像${args.unknowns.slice(0, 2).join("、")}这些小口子后面还能继续补。你要是愿意，我现在就把 handoff 摆给你看。`
      : "我这边已经能把交接内容替你收成一版了。你要是愿意，我现在就把 handoff 摆给你看。";
  }

  if (args.message && isLightAcknowledgementMessage(args.message)) {
    return buildLightAcknowledgementReply({
      previewDraft: args.previewDraft,
      unknowns: args.unknowns ?? [],
    });
  }

  if (baseMode === "capability") {
    return "我们这边主要是先把你的设备想法接住，再往下梳理需求、出 3D 结构草案，最后整理成交接给实验室的内容。你如果已经有方向了，也可以直接告诉我想做什么。";
  }

  if (baseMode === "lab_intro") {
    return "实验室这边更像一个前期接待和方案整理入口，会先陪你把设备方向聊清楚，再决定什么时候出预览、什么时候推进交接。你现在如果只有一个模糊想法，也可以直接往下说。";
  }

  if (baseMode === "greeting" || baseMode === "smalltalk") {
    return "你好呀，我在听。你可以先随便聊聊想法，或者直接告诉我你想做什么设备。";
  }

  if (args.nextAction === "generate_preview" && args.previewDraft) {
    return summary
      ? "好呀，我先按我们刚刚理出来的方向把 3D 草案立起来了。主舞台已经切到新方案，你可以直接看看结构顺不顺眼。"
      : "好呀，我先把 3D 草案立起来了。你可以先看看主舞台里的结构方向顺不顺眼。";
  }

  if (args.nextAction === "prepare_handoff" || args.nextAction === "handoff_to_lab") {
    return args.unknowns?.length
      ? `我先把能交给实验室的内容收好了，像${args.unknowns.slice(0, 2).join("、")}这类小项我们后面还能继续补，不过现在已经可以先整理交接单。`
      : "我先把要交给实验室的内容整理好了，你可以直接打开交接单看看。";
  }

  if (args.workflowState === "handoff_ready" && args.handoffCandidate) {
    return args.unknowns?.length
      ? `我这边已经能先替你收一版交接内容了，像${args.unknowns.slice(0, 2).join("、")}这些小口子后面还能继续补。你要是愿意，我可以先把 handoff 整给你看。`
      : "我这边已经能把交接内容替你收成一版了。你要是愿意，我现在就可以直接把 handoff 整给你看。";
  }

  if (args.previewDraft && !(args.unknowns?.length)) {
    return "我这边已经把一版结构方向收出来了。你要是愿意，我现在就可以直接给你起一个 3D 预览。";
  }

  if (focus) {
    const nextStepQuestion = buildNextStepQuestion(args.unknowns, focus);
    if (nextStepQuestion) {
      return summary
        ? `我先把你刚才给的信息接住了。${nextStepQuestion}`
        : nextStepQuestion;
    }
  }

  if (args.previewDraft && args.unknowns?.length) {
    return `我已经能先拼出一版方向了。现在最想再确认一下${focus ?? args.unknowns.slice(0, 2).join("、")}，这样后面的预览会更稳一点。`;
  }

  if (summary && focus) {
    return `我先把你刚才那条线接住了。接下来我想先确认一下${focus}，这样我就不容易把方案带偏。`;
  }

  if (summary) {
    return "我先听明白一个大概方向了。你继续往下说就好，我会边听边帮你收。";
  }

  if (args.recommendationCards?.length) {
    return `我先帮你收一个方向：${args.recommendationCards[0]?.detail}`;
  }

  if (args.suggestions?.length) {
    return `我先给你一个小建议：${args.suggestions[0]}`;
  }

  return "嗯，我在听。你想到哪儿说到哪儿就好，我来帮你慢慢理。";
}

async function buildModelRequirementPatch(request: IntakeAgentRequest) {
  const model = process.env.SECONDME_INTAKE_REASONING_MODEL;
  if (!model) {
    return undefined;
  }

  try {
    const content = await requestSecondMeChatReply(
      [
        { role: "system", content: buildIntakeReasoningSystemPrompt() },
        { role: "user", content: buildIntakeReasoningUserPrompt(request) },
      ],
      {
        model,
        requireJson: true,
        temperature: 0,
      },
    );

    return sanitizeModelRequirementPatch(JSON.parse(content) as unknown);
  } catch {
    return undefined;
  }
}

function validateLlmNextAction(args: {
  requested?: IntakeNextAction;
  previewDraft?: PreviewDraft;
  handoffCandidate?: LabHandoff;
  fallback: IntakeNextAction;
}) {
  switch (args.requested) {
    case "generate_preview":
      return args.previewDraft ? "generate_preview" : args.fallback;
    case "prepare_handoff":
    case "handoff_to_lab":
    case "handoff_to_human":
      return args.handoffCandidate ? args.requested : args.fallback;
    case "ask_more":
      return "ask_more";
    default:
      return args.fallback;
  }
}

function buildLlmNativeSkillRoute(decision?: LlmNativeDecision): IntakeSkillRoute {
  if (!decision) {
    return {
      active_skill: "requirement-clarifier",
      matched_skills: ["requirement-clarifier"],
      use_secondme: true,
      reason: "LLM-native decision unavailable, fallback to legacy clarification route",
    };
  }

  if (
    decision.agent_stage === "handoff_offer" ||
    decision.agent_stage === "handoff_commit" ||
    decision.next_action === "prepare_handoff" ||
    decision.next_action === "handoff_to_lab"
  ) {
    return {
      active_skill: "handoff-promoter",
      matched_skills: ["handoff-promoter", "requirement-clarifier"],
      use_secondme: true,
      reason: "LLM-native decision requests handoff-stage progression",
    };
  }

  if (
    decision.agent_stage === "preview_offer" ||
    decision.agent_stage === "preview_commit" ||
    decision.next_action === "generate_preview"
  ) {
    return {
      active_skill: "preview-promoter",
      matched_skills: ["preview-promoter", "requirement-clarifier"],
      use_secondme: true,
      reason: "LLM-native decision requests preview-stage progression",
    };
  }

  return {
    active_skill: "requirement-clarifier",
    matched_skills: ["requirement-clarifier"],
    use_secondme: true,
    reason: "LLM-native decision keeps the conversation in clarification mode",
  };
}

function buildOrchestrationFromLlmDecision(args: {
  decision?: LlmNativeDecision;
  message: string;
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  previewDraft?: PreviewDraft;
  fallback: ReplyOrchestration;
}): ReplyOrchestration {
  if (!args.decision) {
    return args.fallback;
  }

  const baseMode = detectConversationBaseMode(args.message);
  const inferredArchetype = args.fallback.inferredArchetype;

  switch (args.decision.agent_stage) {
    case "free_chat":
      return {
        baseMode,
        transitionMode: "stay_conversational",
        priorities: ["connect", "answer_directly", "invite_next_step"],
        shouldAdvanceRequirement: false,
        inferredArchetype,
      };
    case "preview_offer":
    case "preview_commit":
      return {
        baseMode,
        transitionMode: "preview_ready",
        priorities: ["acknowledge", "confirm_preview", "invite_next_step"],
        shouldAdvanceRequirement: true,
        singleFocus: args.decision.single_focus,
        inferredArchetype,
      };
    case "handoff_offer":
    case "handoff_commit":
      return {
        baseMode,
        transitionMode: "handoff_ready",
        priorities: ["acknowledge", "confirm_handoff", "invite_next_step"],
        shouldAdvanceRequirement: true,
        singleFocus: args.decision.single_focus,
        inferredArchetype,
      };
    case "blocked":
      return {
        baseMode,
        transitionMode: "answer_then_offer",
        priorities: ["acknowledge", "offer_suggestion"],
        shouldAdvanceRequirement: false,
        singleFocus: args.decision.single_focus,
        inferredArchetype,
      };
    case "intake":
    case "clarify":
    default:
      return {
        baseMode,
        transitionMode: "soft_clarify",
        priorities: ["acknowledge", "ask_single_question"],
        shouldAdvanceRequirement: true,
        singleFocus: args.decision.single_focus ?? args.unknowns[0],
        inferredArchetype,
      };
  }
}

function resolveWorkflowControl(args: {
  message: string;
  state: IntakeAgentState;
  previewDraft?: PreviewDraft;
  labHandoff?: LabHandoff;
  unknowns: string[];
  llmNativeDecision?: LlmNativeDecision;
  orchestration: ReplyOrchestration;
}) {
  const forcedConversational = args.orchestration.transitionMode === "stay_conversational";
  const readiness = decideReadinessFlow({
    message: args.message,
    previewDraft: args.previewDraft,
    labHandoff: args.labHandoff,
    state: forcedConversational ? { ...args.state, workflow_state: "collecting" } : args.state,
    unknowns: args.unknowns,
    llmDecision: args.llmNativeDecision
      ? {
          agent_stage: args.llmNativeDecision.agent_stage,
          preview_candidate_ready: args.llmNativeDecision.preview_candidate_ready,
          handoff_candidate_ready: args.llmNativeDecision.handoff_candidate_ready,
          next_action: args.llmNativeDecision.next_action,
        }
      : undefined,
  });

  const workflowState: IntakeAgentState["workflow_state"] = forcedConversational
    ? "collecting"
    : readiness.workflowState;
  const nextAction = validateLlmNextAction({
    requested: forcedConversational ? "ask_more" : args.llmNativeDecision?.next_action,
    previewDraft: args.previewDraft,
    handoffCandidate: args.labHandoff,
    fallback: forcedConversational ? "ask_more" : readiness.nextAction,
  });
  const exposedPreviewDraft = readiness.exposePreview ? args.previewDraft : undefined;
  const exposedLabHandoff = readiness.exposeHandoff ? args.labHandoff : undefined;

  return {
    workflowState,
    nextAction,
    exposedPreviewDraft,
    exposedLabHandoff,
  };
}

async function buildLlmNativeDecision(request: IntakeAgentRequest, draft: {
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  previewDraft?: PreviewDraft;
  handoffCandidate?: LabHandoff;
  reasoning: ReturnType<typeof analyzeRequirementReasoning>;
  risks: string[];
}) {
  const model =
    process.env.SECONDME_INTAKE_REASONING_MODEL ??
    process.env.SECONDME_INTAKE_CHAT_MODEL;

  if (!model) {
    return undefined;
  }

  try {
    const content = await requestSecondMeChatReply(
      [
        { role: "system", content: buildLlmNativeDecisionSystemPrompt() },
        {
          role: "user",
          content: buildLlmNativeDecisionUserPrompt({
            request,
            confirmed: draft.confirmed,
            unknowns: draft.unknowns,
            previewCandidateReady: Boolean(draft.previewDraft),
            handoffCandidateReady: Boolean(draft.handoffCandidate),
            reasoningSummary: draft.reasoning.profile,
            risks: draft.risks,
          }),
        },
      ],
      {
        model,
        requireJson: true,
        temperature: 0,
      },
    );

    return sanitizeLlmNativeDecision(JSON.parse(content) as unknown);
  } catch {
    return undefined;
  }
}

async function buildModelCustomerReply(request: IntakeAgentRequest, draft: {
  confirmed: ConfirmedRequirement;
  unknowns: string[];
  nextAction: IntakeNextAction;
  previewDraft?: PreviewDraft;
  reasoning: ReturnType<typeof analyzeRequirementReasoning>;
  suggestions: IntakeSuggestion[];
  orchestration: ReplyOrchestration;
  reminderBundle: ReturnType<typeof buildReminderBundle>;
  memory: ReturnType<typeof analyzeConversationMemory>;
  route: IntakeSkillRoute;
}) {
  if (!isSecondMeChatConfigured()) {
    return null;
  }

  const route = draft.route;
  const singleFocusInstruction = draft.orchestration.singleFocus
    ? `\u5982\u679c\u8fd9\u8f6e\u9700\u8981\u8ffd\u95ee\uff0c\u53ea\u80fd\u56f4\u7ed5\u300c${draft.orchestration.singleFocus}\u300d\u8fd9\u4e00\u4e2a\u70b9\u95ee\u4e00\u4e2a\u6700\u5173\u952e\u7684\u95ee\u9898\uff0c\u4e0d\u8981\u6362\u6210\u66f4\u5bbd\u7684\u9700\u6c42\u76d8\u95ee\uff0c\u4e5f\u4e0d\u8981\u8df3\u5230\u5176\u4ed6\u4e3b\u9898\u3002`
    : undefined;

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
      ...(singleFocusInstruction ? [singleFocusInstruction] : []),
      "请只输出一段自然中文回复，不要输出 JSON。",
      "不要复述结构化字段名。",
      "不要把自己说得像表单机器人。",
      "如果只是闲聊或寒暄，就先接住话，不要急着办事。",
      "如果用户只是说“谢谢”“好的”“明白了”这种轻量回应，就自然接住并给一个很轻的下一步入口，不要突然转成追问。",
      "如果用户刚刚回答了你上一轮的问题，不要重复追问同一个点；这个点已经补齐时，就往下推进或顺手帮他收一收方向。",
      "如果需要追问，通常只问一个最关键的问题。",
      "如果已经可以 preview 或 handoff，先给用户一个被接住、被整理好的感觉，再邀请他进入下一步。",
      "尽量少用生硬的状态播报句式，比如“当前已进入”“现已生成”。",
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

  const localConfirmed = deriveConfirmed(message, state.confirmed, history);
  const modelRequirementPatch = canUseReasoningModel()
    ? await buildModelRequirementPatch({
        ...request,
        state: {
          ...request.state,
          confirmed: localConfirmed,
        },
      })
    : undefined;
  const confirmed = mergeReasoningPatch(localConfirmed, modelRequirementPatch);
  const reasoningTrace = buildReasoningTrace(modelRequirementPatch);
  const reasoning = analyzeRequirementReasoning(confirmed);
  const suggestions = buildIntakeSuggestions(confirmed, reasoning);
  const reminderBundle = buildReminderBundle(confirmed);
  const guardrailUnknowns = computeUnknowns(confirmed);
  const baselineUnknowns = unique([...guardrailUnknowns, ...reasoning.mustConfirm]);
  const previewDraft = mapConfirmedToPreviewDraft(confirmed);
  const baselineRisks = unique([
    ...state.risks,
    ...reasoning.risks,
    ...reminderBundle.riskAlerts,
    ...(previewDraft ? [] : ["褰撳墠淇℃伅杩樹笉瓒充互绋冲畾鐢熸垚 3D 棰勮鑽夋"]),
  ]);
  const baselineRequirementSummary = buildRequirementSummary(confirmed);
  const baselineLabHandoff = buildLabHandoff(
    confirmed,
    baselineRequirementSummary,
    baselineUnknowns,
    baselineRisks,
    reasoningTrace,
    previewDraft,
  );
  const llmNativeDecision = await buildLlmNativeDecision(request, {
    confirmed,
    unknowns: baselineUnknowns,
    previewDraft,
    handoffCandidate: baselineLabHandoff,
    reasoning,
    risks: baselineRisks,
  });
  const slotAssessmentUnknowns = llmNativeDecision
    ? deriveUnknownsFromSlotAssessments(guardrailUnknowns, llmNativeDecision.slot_assessments)
    : baselineUnknowns;
  const llmNativeUnknowns = llmNativeDecision?.unknowns.length
    ? unique([...slotAssessmentUnknowns, ...llmNativeDecision.unknowns])
    : slotAssessmentUnknowns;
  const unknowns = normalizeUnknownFields(
    llmNativeDecision
      ? unique([...llmNativeUnknowns, ...guardrailUnknowns])
      : baselineUnknowns,
  );
  const memory = analyzeConversationMemory({
    message,
    history,
    unknowns,
  });
  const route: IntakeSkillRoute = buildLlmNativeSkillRoute(llmNativeDecision);
  const legacyOrchestration = planReplyOrchestration({
    message,
    confirmed,
    unknowns,
    nextAction: "ask_more",
    route,
    previewDraft,
    memory,
  });
  const orchestration = buildOrchestrationFromLlmDecision({
    decision: llmNativeDecision,
    message,
    confirmed,
    unknowns,
    previewDraft,
    fallback: legacyOrchestration,
  });

  const risks = unique([
    ...state.risks,
    ...reasoning.risks,
    ...reminderBundle.riskAlerts,
    ...(llmNativeDecision ? deriveRisksFromSlotAssessments(llmNativeDecision.slot_assessments) : []),
    ...(llmNativeDecision?.risks ?? []),
    ...(previewDraft ? [] : ["当前信息还不足以稳定生成 3D 预览草案"]),
  ]);

  const requirementSummary = baselineRequirementSummary;
  const labHandoff = buildLabHandoff(
    confirmed,
    requirementSummary,
    unknowns,
    risks,
    reasoningTrace,
    previewDraft,
  );
  const { workflowState, nextAction, exposedPreviewDraft, exposedLabHandoff } =
    resolveWorkflowControl({
      message,
      state,
      previewDraft,
      labHandoff,
      unknowns,
      llmNativeDecision,
      orchestration,
    });

  const rawCustomerReply =
    llmNativeDecision?.customer_reply ??
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
      route,
    })) ??
    buildFallbackCustomerReply({
      message,
      confirmed,
      workflowState,
      nextAction,
      previewDraft: exposedPreviewDraft ?? previewDraft,
      handoffCandidate: labHandoff,
      unknowns,
      suggestions: reasoning.suggestions,
      recommendationCards: suggestions,
      orchestration,
    });
  const customerReply = applyReplyGuard({
    message,
    reply: rawCustomerReply,
    confirmed,
    unknowns,
    nextAction,
    previewDraft: exposedPreviewDraft ?? previewDraft,
    workflowState,
    handoffCandidate: labHandoff,
    focus: orchestration.singleFocus,
    transitionMode: orchestration.transitionMode,
  });

  const structuredOutput = buildStructuredIntakeOutput({
    workflowState,
    confirmed,
    unknowns,
    risks,
    suggestions,
    assumptions: previewDraft?.assumptions ?? [],
    previewCandidate: previewDraft,
    handoffCandidate: labHandoff,
    exposedPreviewDraft,
    exposedLabHandoff,
    requirementSummary: requirementSummary || "已记录当前对话，等待进一步补充。",
    intent: inferIntent(message),
    nextAction,
    debug: {
      workflow_state: workflowState,
      active_skill: route.active_skill,
      matched_skills: route.matched_skills,
      routing_reason: route.reason,
      transition_mode: orchestration.transitionMode,
      single_focus: orchestration.singleFocus,
      inferred_archetype: orchestration.inferredArchetype,
      memory_mode: memory.mode,
      unknowns,
      risks,
      next_action: nextAction,
      llm_native_stage: llmNativeDecision?.agent_stage,
      llm_native_unknowns: llmNativeDecision?.unknowns,
      llm_native_single_focus: llmNativeDecision?.single_focus,
      llm_native_next_action: llmNativeDecision?.next_action,
      llm_native_preview_ready: llmNativeDecision?.preview_candidate_ready,
      llm_native_handoff_ready: llmNativeDecision?.handoff_candidate_ready,
      has_preview_candidate: Boolean(previewDraft),
      has_handoff_candidate: Boolean(labHandoff),
      offering_preview: workflowState === "preview_ready",
      offering_handoff: workflowState === "handoff_ready" && !exposedLabHandoff,
      exposed_preview: Boolean(exposedPreviewDraft),
      exposed_handoff: Boolean(exposedLabHandoff),
      reasoning_trace: reasoningTrace,
    },
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
