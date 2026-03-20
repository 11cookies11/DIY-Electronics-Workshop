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

function hasAnyIoHints(confirmed: ConfirmedRequirement) {
  return Boolean(
    confirmed.connectivity?.length ||
      confirmed.ports?.length ||
      confirmed.controls?.length ||
      confirmed.screen,
  );
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
      if (!hasValue(confirmed.target_devices)) {
        mustConfirm.push("控制对象");
      }
      if (!hasValue(confirmed.controls) && !confirmed.screen) {
        mustConfirm.push("主要交互方式");
      }
      if (!confirmed.core_features?.includes("红外控制")) {
        suggestions.push("遥控器通常会包含红外控制能力。");
      }
      break;
    case "智能手表":
      if (!confirmed.screen && !hasValue(confirmed.controls)) {
        mustConfirm.push("主要交互方式");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("穿戴设备建议尽早确认电池容量与充电方式。");
      }
      break;
    case "桌面设备":
    case "桌面监测设备":
      if (!hasAnyIoHints(confirmed)) {
        mustConfirm.push("接口或连接方式");
      }
      if (!hasValue(confirmed.power)) {
        suggestions.push("桌面设备建议先明确外接供电还是内置电池。");
      }
      break;
    case "蓝牙音箱":
      if (!hasValue(confirmed.audio)) {
        mustConfirm.push("核心功能");
      }
      if (!confirmed.connectivity?.includes("蓝牙")) {
        suggestions.push("蓝牙音箱通常需要蓝牙连接。");
      }
      break;
    case "手持设备":
      if (!confirmed.screen && !hasValue(confirmed.controls)) {
        mustConfirm.push("主要交互方式");
      }
      break;
    default:
      if (!hasValue(confirmed.core_features)) {
        mustConfirm.push("核心功能");
      }
      if (!hasAnyIoHints(confirmed)) {
        mustConfirm.push("接口或连接方式");
      }
      break;
  }

  if (confirmed.connectivity?.includes("Wi-Fi") && !hasValue(confirmed.power)) {
    risks.push("已选择 Wi-Fi 连接但供电方式未定，后续功耗评估会偏差较大。");
  }

  if (confirmed.screen && !hasValue(confirmed.size)) {
    suggestions.push("如果要生成 3D 预览，补一个大致尺寸会更接近真实设备。");
  }

  return {
    profile,
    mustConfirm: unique(mustConfirm),
    suggestions: unique(suggestions).slice(0, 3),
    risks: unique(risks),
  };
}
