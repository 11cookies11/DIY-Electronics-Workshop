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

function buildCapabilityReply(state: IntakeAgentState) {
  const summary = buildRequirementSummary(state.confirmed);
  if (summary) {
    return `我这边主要帮你做三件事：先把想法聊清楚，再整理成 3D 预览草案，最后收成实验室能继续跟进的交接信息。你这边我已经记住的是：${summary}。`;
  }

  return "我这边主要帮你做三件事：先把想法聊清楚，再整理成 3D 预览草案，最后收成实验室能继续跟进的交接信息。你也可以先把它当成一个会聊天、懂硬件的前台。";
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
    return "你好呀，我在。你想先随便聊聊想法，还是直接说说准备做什么设备？";
  }

  if (hasPattern(message, [/(最近怎么样|你忙吗|今天天气|随便聊聊)/])) {
    return "可以啊，我们先轻松聊也没问题。你聊着聊着说到产品想法时，我再帮你顺手收需求。";
  }

  if (
    hasPattern(message, [
      /(你是谁|你是做什么的|你能做什么|你会什么|介绍一下你自己)/,
    ])
  ) {
    return buildCapabilityReply(state);
  }

  if (hasPattern(message, [/(介绍一下实验室|介绍实验室|你们实验室做什么)/])) {
    return "我们这边主要接嵌入式产品的前期沟通、方案梳理和 3D 结构预览。简单说，就是先把客户想法聊清楚，再整理成实验室能继续推进的输入。";
  }

  if (hasPattern(message, [/(谢谢|多谢|辛苦了)/])) {
    return "不客气，我们慢慢聊就行。你想到哪儿说到哪儿，我帮你收。";
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
