import type { ConfirmedRequirement, IntakeSuggestion } from "./types";

type ReasoningSlice = {
  profile: string;
  mustConfirm: string[];
  suggestions: string[];
  risks: string[];
};

function pushSuggestion(
  list: IntakeSuggestion[],
  suggestion: IntakeSuggestion | undefined,
) {
  if (!suggestion) return;
  if (list.some((item) => item.id === suggestion.id)) return;
  list.push(suggestion);
}

function hasValue(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function buildIntakeSuggestions(
  confirmed: ConfirmedRequirement,
  reasoning: ReasoningSlice,
): IntakeSuggestion[] {
  const suggestions: IntakeSuggestion[] = [];

  switch (confirmed.device_type) {
    case "红外遥控器":
      pushSuggestion(suggestions, {
        id: "remote-controls-first",
        category: "interaction",
        title: "先把主交互定成按键或触屏",
        detail:
          hasValue(confirmed.screen)
            ? "如果你想保留屏幕，可以把屏幕当状态区，再配一组核心按键，这样遥控器会更顺手。"
            : "遥控器更常见的做法是先确定按键区，再决定是否额外加一块小屏。这样功能和尺寸都更容易收住。",
        reason: "遥控器的上手效率通常先取决于主交互，而不是先堆更多模块。",
      });
      if (!hasValue(confirmed.power)) {
        pushSuggestion(suggestions, {
          id: "remote-power-tradeoff",
          category: "power",
          title: "供电可以先在电池和充电式之间选方向",
          detail:
            hasValue(confirmed.screen) || confirmed.connectivity?.includes("Wi-Fi")
              ? "你这个方向已经带屏幕或 Wi-Fi 了，我会更偏向充电式，后面续航和厚度更容易一起评估。"
              : "如果想做得轻一点，可以考虑干电池；如果想更像数码产品，充电式会更自然。",
          reason: "遥控器的供电方式会直接影响厚度、续航和内部布局。",
        });
      }
      break;
    case "智能手表":
      pushSuggestion(suggestions, {
        id: "watch-baseline",
        category: "module",
        title: "手表常见会先围绕蓝牙、IMU 和电池来定基线",
        detail:
          "如果你暂时还没完全想好，我会先把它理解成一块主屏、一个低功耗主控、蓝牙、IMU 和内置电池的组合，再慢慢补充传感和外观约束。",
        reason: "这样更符合穿戴设备的常见起步方式，也更方便后面做 3D 草案。",
      });
      if (!hasValue(confirmed.power)) {
        pushSuggestion(suggestions, {
          id: "watch-charging",
          category: "power",
          title: "可以顺手把充电方式一起定下来",
          detail:
            "手表这类设备通常会尽早确认磁吸充电、触点充电或 USB-C 转接，不然尺寸和壳体结构会很难先收住。",
          reason: "充电方式会直接影响壳体开孔、厚度和续航判断。",
        });
      }
      break;
    case "桌面设备":
      pushSuggestion(suggestions, {
        id: "desktop-power-io",
        category: "structure",
        title: "桌面设备一般先把供电和接口摆在前面",
        detail:
          "如果是桌面场景，我会优先建议先定外接供电、USB-C 或其他接口，再往里补屏幕、传感和无线。",
        reason: "桌面设备对接口和供电的依赖通常比便携设备更强。",
      });
      break;
    case "蓝牙音箱":
      pushSuggestion(suggestions, {
        id: "speaker-audio-chain",
        category: "module",
        title: "音箱类可以先把音频链想清楚",
        detail:
          "通常会先定蓝牙、扬声器、功放和供电，再决定要不要加麦克风、屏幕或更多交互。",
        reason: "音频主链一旦清楚，后面的结构和功耗判断会稳很多。",
      });
      break;
    case "手持设备":
      pushSuggestion(suggestions, {
        id: "handheld-grip",
        category: "structure",
        title: "手持设备可以先围绕握持和充电口来收结构",
        detail:
          "如果你想要便携感更强，我会优先建议先定大致尺寸、电池方向和 USB-C 位置，再补屏幕和功能模块。",
        reason: "握持尺寸和充电方式通常最先决定手持设备的整体感觉。",
      });
      break;
    default:
      pushSuggestion(suggestions, {
        id: "generic-baseline",
        category: "module",
        title: `可以先从 ${reasoning.profile} 的基础组合开始`,
        detail:
          "如果你现在还在想方向，我可以先帮你按主控、供电、交互和连接这四层给一个基础组合，再慢慢加个性化功能。",
        reason: "先有基础骨架，后面再加模块会比一开始全铺开更清楚。",
      });
      break;
  }

  if (hasValue(confirmed.screen) && !hasValue(confirmed.size)) {
    pushSuggestion(suggestions, {
      id: "screen-size",
      category: "structure",
      title: "屏幕类设备最好补一个大致尺寸",
      detail:
        "哪怕先给个很粗的宽高厚范围也行，这样后面做 3D 草案时会更像真实设备，不容易把结构想得太理想化。",
      reason: "屏幕投影会直接影响主板、按钮和电池的布局空间。",
    });
  }

  if (confirmed.connectivity?.includes("Wi-Fi") && !hasValue(confirmed.power)) {
    pushSuggestion(suggestions, {
      id: "wifi-power",
      category: "connectivity",
      title: "带 Wi‑Fi 的设备建议尽早确认供电",
      detail:
        "如果要走 Wi‑Fi，我会建议你尽快定电池还是外接供电，不然续航和热设计会很难先判断。",
      reason: "Wi‑Fi 往往会显著拉高功耗预估。",
    });
  }

  if (!hasValue(confirmed.controls) && !hasValue(confirmed.screen) && !hasValue(confirmed.ports)) {
    pushSuggestion(suggestions, {
      id: "interaction-first",
      category: "interaction",
      title: "可以先定主交互方式",
      detail:
        "你可以先告诉我它更像按键设备、触屏设备，还是主要靠手机配套控制，我就能更快把结构方向收出来。",
      reason: "主交互方式几乎会影响整个外壳和内部布局。",
    });
  }

  for (const [index, text] of reasoning.suggestions.slice(0, 2).entries()) {
    pushSuggestion(suggestions, {
      id: `reasoning-${index}`,
      category: "module",
      title: "顺手给你一个常见思路",
      detail: text,
      reason: "这是当前设备方向下比较常见的一条补充建议。",
    });
  }

  return suggestions.slice(0, 4);
}
