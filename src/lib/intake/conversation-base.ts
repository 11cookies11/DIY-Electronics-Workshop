import type { ConfirmedRequirement, IntakeAgentState } from "./types";

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function normalizeMessage(message: string) {
  return message.trim().replace(/[，。！？、\s]+/g, "").toLowerCase();
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

function buildIntroReply(state: IntakeAgentState) {
  const summary = buildRequirementSummary(state.confirmed);
  if (summary) {
    return `当然可以。我现在既能陪你聊方案，也能把需求逐步整理成 3D 预览和实验室交接单。你这边我已经记住的是：${summary}。你想继续细化功能，还是先让我介绍一下这套方案怎么推进？`;
  }

  return "当然可以。我不是只会填表的前台，也可以先陪你聊产品方向、使用场景和方案思路。等信息够了，我再帮你整理成 3D 预览草案和实验室交接单。";
}

export function buildBaseConversationReply(
  message: string,
  state: IntakeAgentState,
) {
  const normalized = normalizeMessage(message);

  if (
    [
      "你好",
      "你好呀",
      "你好啊",
      "您好",
      "嗨",
      "hi",
      "hello",
      "在吗",
      "有人吗",
      "哈喽",
      "哈啰",
    ].includes(normalized)
  ) {
    return "你好呀，我在。你可以先随便和我聊聊想法，也可以让我帮你一起梳理设备方案。";
  }

  if (
    hasPattern(message, [
      /(你是谁|你能做什么|你会什么|介绍一下你自己)/,
    ])
  ) {
    return buildIntroReply(state);
  }

  if (hasPattern(message, [/(谢谢|多谢|辛苦了)/])) {
    return "不客气。你继续说想法就行，我会一边聊天一边帮你把需求收成可执行的方案。";
  }

  return null;
}

export function countStructuredSignals(confirmed: ConfirmedRequirement) {
  return [
    confirmed.device_type,
    confirmed.use_case,
    confirmed.screen,
    confirmed.size,
    ...(confirmed.controls ?? []),
    ...(confirmed.sensors ?? []),
    ...(confirmed.connectivity ?? []),
    ...(confirmed.ports ?? []),
    ...(confirmed.power ?? []),
    ...(confirmed.core_features ?? []),
  ].filter(Boolean).length;
}
