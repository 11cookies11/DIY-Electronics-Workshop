import type { ConfirmedRequirement } from "./types";

export type DeviceArchetype =
  | "remote_like"
  | "handheld_like"
  | "desktop_like"
  | "wearable_like"
  | "speaker_like";

export type DeviceArchetypeScores = Partial<Record<DeviceArchetype, number>>;

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function addScore(
  scores: DeviceArchetypeScores,
  archetype: DeviceArchetype,
  value: number,
) {
  scores[archetype] = (scores[archetype] ?? 0) + value;
}

export function inferDeviceArchetypeScores(args: {
  message?: string;
  confirmed: ConfirmedRequirement;
}): DeviceArchetypeScores {
  const { message = "", confirmed } = args;
  const scores: DeviceArchetypeScores = {};

  switch (confirmed.device_type) {
    case "红外遥控器":
      addScore(scores, "remote_like", 10);
      break;
    case "手持设备":
      addScore(scores, "handheld_like", 10);
      break;
    case "桌面设备":
      addScore(scores, "desktop_like", 10);
      break;
    case "智能手表":
      addScore(scores, "wearable_like", 10);
      break;
    case "蓝牙音箱":
      addScore(scores, "speaker_like", 10);
      break;
    default:
      break;
  }

  if (confirmed.target_devices?.length) addScore(scores, "remote_like", 4);
  if (confirmed.button_preferences?.length) addScore(scores, "remote_like", 2);
  if (confirmed.core_features?.includes("红外控制")) addScore(scores, "remote_like", 4);
  if (confirmed.controls?.includes("按键")) addScore(scores, "remote_like", 1);
  if (confirmed.power?.includes("电池供电")) addScore(scores, "remote_like", 1);

  if (confirmed.portability?.includes("便携") || confirmed.portability?.includes("手持")) {
    addScore(scores, "handheld_like", 3);
  }
  if (confirmed.screen || confirmed.controls?.length) addScore(scores, "handheld_like", 1);
  if (confirmed.power?.includes("电池供电")) addScore(scores, "handheld_like", 2);
  if (confirmed.use_case?.includes("外出")) addScore(scores, "handheld_like", 1);

  if (
    confirmed.placement?.includes("桌") ||
    confirmed.placement?.includes("书房") ||
    confirmed.placement?.includes("办公")
  ) {
    addScore(scores, "desktop_like", 4);
  }
  if (confirmed.power?.includes("外接供电")) addScore(scores, "desktop_like", 2);
  if (confirmed.ports?.length) addScore(scores, "desktop_like", 1);
  if (confirmed.connectivity?.length) addScore(scores, "desktop_like", 1);

  if (confirmed.sensors?.includes("IMU")) addScore(scores, "wearable_like", 2);
  if (confirmed.connectivity?.includes("蓝牙")) addScore(scores, "wearable_like", 1);
  if (confirmed.power?.includes("电池供电")) addScore(scores, "wearable_like", 1);

  if (confirmed.audio?.length) addScore(scores, "speaker_like", 4);
  if (confirmed.core_features?.includes("音频播放")) addScore(scores, "speaker_like", 3);
  if (confirmed.sensors?.includes("麦克风")) addScore(scores, "speaker_like", 1);

  if (
    hasPattern(message, [
      /(控制电视|控制空调|控制投影|控制灯|控制风扇)/,
      /(像遥控器|遥控一样|按键大一点)/,
    ])
  ) {
    addScore(scores, "remote_like", 4);
  }

  if (hasPattern(message, [/(拿在手里|握在手里|随身带着|便携|手持)/])) {
    addScore(scores, "handheld_like", 4);
  }

  if (hasPattern(message, [/(放桌上|桌面上|办公桌|书桌|床头柜|茶几上)/])) {
    addScore(scores, "desktop_like", 4);
  }

  if (hasPattern(message, [/(戴在手上|戴在手腕|穿戴|表带)/])) {
    addScore(scores, "wearable_like", 5);
  }

  if (hasPattern(message, [/(音箱|扬声器|听歌|播歌|语音播放|外放)/])) {
    addScore(scores, "speaker_like", 5);
  }

  return scores;
}

export function pickLeadingArchetype(
  scores: DeviceArchetypeScores,
  minScore = 3,
): DeviceArchetype | undefined {
  const ranked = Object.entries(scores)
    .filter((entry): entry is [DeviceArchetype, number] => typeof entry[1] === "number")
    .sort((left, right) => right[1] - left[1]);

  if (!ranked.length || ranked[0][1] < minScore) {
    return undefined;
  }

  return ranked[0][0];
}

export function inferDeviceTypeFromArchetype(args: {
  message?: string;
  confirmed: ConfirmedRequirement;
}) {
  const archetype = pickLeadingArchetype(inferDeviceArchetypeScores(args));

  switch (archetype) {
    case "remote_like":
      return "红外遥控器";
    case "handheld_like":
      return "手持设备";
    case "desktop_like":
      return "桌面设备";
    case "wearable_like":
      return "智能手表";
    case "speaker_like":
      return "蓝牙音箱";
    default:
      return undefined;
  }
}
