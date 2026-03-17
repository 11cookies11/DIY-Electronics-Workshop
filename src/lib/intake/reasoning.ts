import type { ConfirmedRequirement } from "./types";

type DeviceReasoning = {
  profile: string;
  mustConfirm: string[];
  suggestions: string[];
  risks: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasValue(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function analyzeRequirementReasoning(
  confirmed: ConfirmedRequirement,
): DeviceReasoning {
  const profile = confirmed.device_type ?? "通用嵌入式设备";
  const mustConfirm: string[] = [];
  const suggestions: string[] = [];
  const risks: string[] = [];

  if (!hasValue(confirmed.use_case)) {
    mustConfirm.push("使用场景");
  }
  if (!hasValue(confirmed.power)) {
    mustConfirm.push("供电方式");
  }

  switch (confirmed.device_type) {
    case "红外遥控器":
      if (!hasValue(confirmed.controls)) {
        mustConfirm.push("按键或触屏交互");
      }
      if (!confirmed.core_features?.includes("红外控制")) {
        suggestions.push("遥控器通常至少会包含红外控制能力。");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("遥控器一般会在电池供电和充电式之间先确定一个方向。");
      }
      if (confirmed.screen && !hasValue(confirmed.power)) {
        risks.push("带屏幕的遥控器如果还没确认供电方式，后面续航判断会很飘。");
      }
      break;
    case "智能手表":
      if (!confirmed.screen) {
        mustConfirm.push("屏幕或主交互方式");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("手表通常要尽早确认电池、续航和充电方式。");
      }
      if (!confirmed.connectivity?.includes("蓝牙")) {
        suggestions.push("智能手表常见会考虑蓝牙，用来连接手机或配件。");
      }
      if (!confirmed.sensors?.includes("IMU")) {
        suggestions.push("如果是穿戴场景，IMU 往往会是很自然的一类传感器。");
      }
      break;
    case "桌面设备":
      if (!hasValue(confirmed.power)) {
        suggestions.push("桌面设备通常优先确认外接供电还是内置电池。");
      }
      if (!hasValue(confirmed.ports) && !hasValue(confirmed.connectivity)) {
        mustConfirm.push("接口或连接方式");
      }
      break;
    case "蓝牙音箱":
      if (!hasValue(confirmed.audio)) {
        mustConfirm.push("播放或拾音方式");
      }
      if (!confirmed.connectivity?.includes("蓝牙")) {
        suggestions.push("蓝牙音箱通常至少会带蓝牙连接。");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("音频设备通常要先分清电池便携还是外接供电。");
      }
      break;
    case "手持设备":
      if (!confirmed.screen && !hasValue(confirmed.controls)) {
        mustConfirm.push("主交互方式");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("手持设备通常优先确认电池、USB-C 和大致握持尺寸。");
      }
      break;
    default:
      if (!hasValue(confirmed.core_features)) {
        mustConfirm.push("核心功能");
      }
      break;
  }

  if (confirmed.connectivity?.includes("Wi-Fi") && !hasValue(confirmed.power)) {
    risks.push("带 Wi-Fi 的设备如果供电方式未定，功耗和续航判断会偏差很大。");
  }

  if (confirmed.screen && !hasValue(confirmed.size)) {
    suggestions.push("如果后面要做 3D 草案，补一个大致尺寸会更像真实设备。");
  }

  return {
    profile,
    mustConfirm: unique(mustConfirm),
    suggestions: unique(suggestions).slice(0, 3),
    risks: unique(risks),
  };
}
