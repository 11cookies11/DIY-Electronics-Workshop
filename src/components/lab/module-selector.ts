"use client";

import {
  getDefaultModuleSet,
  getModuleById,
  searchModules,
} from "./module-catalog";
import type { ModuleComponent } from "./module-registry";

export type RequirementSignal =
  | "display"
  | "wireless"
  | "cellular"
  | "industrial"
  | "battery"
  | "dcInput"
  | "relay"
  | "motor"
  | "lighting"
  | "button"
  | "knob"
  | "tempHumidity"
  | "imu"
  | "camera"
  | "distance"
  | "current";

export type RequirementAnalysis = {
  rawText: string;
  normalizedText: string;
  signals: RequirementSignal[];
  keywords: string[];
};

export type ModuleSelectionResult = {
  analysis: RequirementAnalysis;
  modules: ModuleComponent[];
  reasons: Record<string, string>;
};

const SIGNAL_PATTERNS: Array<{
  signal: RequirementSignal;
  patterns: string[];
}> = [
  { signal: "display", patterns: ["显示", "屏幕", "触摸", "界面", "本地显示"] },
  { signal: "wireless", patterns: ["wifi", "无线", "联网", "上传", "蓝牙", "ble"] },
  { signal: "cellular", patterns: ["4g", "lte", "蜂窝", "远程"] },
  { signal: "industrial", patterns: ["工业", "485", "rs485", "can", "plc"] },
  { signal: "battery", patterns: ["电池", "便携", "续航", "充电"] },
  { signal: "dcInput", patterns: ["dc", "适配器", "外接供电", "输入电源"] },
  { signal: "relay", patterns: ["继电器", "开关控制", "通断控制"] },
  { signal: "motor", patterns: ["电机", "马达", "驱动", "转动"] },
  { signal: "lighting", patterns: ["led", "灯光", "照明", "亮度"] },
  { signal: "button", patterns: ["按钮", "按键", "键盘"] },
  { signal: "knob", patterns: ["旋钮", "编码器", "调节"] },
  { signal: "tempHumidity", patterns: ["温湿度", "环境监测", "采集温度", "采集湿度"] },
  { signal: "imu", patterns: ["imu", "姿态", "加速度", "陀螺仪"] },
  { signal: "camera", patterns: ["摄像头", "图像", "视觉", "拍照"] },
  { signal: "distance", patterns: ["距离", "测距", "tof", "超声"] },
  { signal: "current", patterns: ["电流", "功耗", "采样", "电压电流"] },
];

const SIGNAL_TO_MODULES: Record<
  RequirementSignal,
  Array<{ id: string; reason: string }>
> = {
  display: [
    { id: "display_panel", reason: "需求里提到本地显示或屏幕交互。" },
    { id: "status_led", reason: "显示类设备通常会配套状态反馈灯。" },
  ],
  wireless: [
    { id: "wifi_module", reason: "需求里提到无线联网或 WiFi 上传。" },
  ],
  cellular: [
    { id: "lte_module", reason: "需求里提到 4G、LTE 或远程蜂窝联网。" },
  ],
  industrial: [
    { id: "stm32_board", reason: "工业通信场景优先采用更稳健的主控板方案。" },
    { id: "rs485_module", reason: "需求里提到工业总线或 RS485 通信。" },
    { id: "can_module", reason: "工业/车载类场景适合 CAN 通信模块。" },
  ],
  battery: [
    { id: "battery_pack", reason: "需求里提到便携或电池供电。" },
    { id: "buck_converter", reason: "电池方案通常需要降压和电源管理。" },
  ],
  dcInput: [
    { id: "dc_input", reason: "需求里提到外接 DC 供电。" },
    { id: "power_protection", reason: "外接电源输入建议加入保护模块。" },
  ],
  relay: [{ id: "relay_module", reason: "需求里提到继电器或开关控制。" }],
  motor: [{ id: "motor_driver", reason: "需求里提到电机/马达驱动。" }],
  lighting: [{ id: "led_driver", reason: "需求里提到 LED 或灯光控制。" }],
  button: [{ id: "button_pad", reason: "需求里提到按钮或按键输入。" }],
  knob: [{ id: "knob_input", reason: "需求里提到旋钮或编码器输入。" }],
  tempHumidity: [
    { id: "temp_humidity_sensor", reason: "需求里提到温湿度采集或环境监测。" },
  ],
  imu: [{ id: "imu_sensor", reason: "需求里提到姿态、加速度或 IMU。" }],
  camera: [{ id: "camera_sensor", reason: "需求里提到视觉或摄像头模块。" }],
  distance: [{ id: "distance_sensor", reason: "需求里提到测距或距离检测。" }],
  current: [{ id: "current_sensor", reason: "需求里提到功耗、电流或采样监测。" }],
};

function normalizeRequirement(text: string) {
  return text.trim().toLowerCase();
}

function extractSignals(normalizedText: string) {
  return SIGNAL_PATTERNS.filter(({ patterns }) =>
    patterns.some((pattern) => normalizedText.includes(pattern)),
  ).map(({ signal }) => signal);
}

function extractKeywords(text: string) {
  return text
    .split(/[\s,，。；;、/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function ensureModule(
  modules: Map<string, ModuleComponent>,
  reasons: Record<string, string>,
  id: string,
  reason: string,
) {
  const module = getModuleById(id);
  if (!module) {
    return;
  }

  modules.set(id, module);
  if (!reasons[id]) {
    reasons[id] = reason;
  }
}

function pickController(signals: RequirementSignal[], normalizedText: string) {
  if (
    signals.includes("industrial") ||
    normalizedText.includes("稳定控制") ||
    normalizedText.includes("高可靠")
  ) {
    return {
      id: "stm32_board",
      reason: "检测到工业或高可靠控制诉求，优先推荐 STM32 主控。",
    };
  }

  return {
    id: "esp32_board",
    reason: "默认采用通用型 ESP32 主控，兼顾联网和快速验证。",
  };
}

export function analyzeRequirement(text: string): RequirementAnalysis {
  const normalizedText = normalizeRequirement(text);

  return {
    rawText: text,
    normalizedText,
    signals: extractSignals(normalizedText),
    keywords: extractKeywords(text),
  };
}

export function selectModulesForRequirement(text: string): ModuleSelectionResult {
  const analysis = analyzeRequirement(text);
  const modules = new Map<string, ModuleComponent>();
  const reasons: Record<string, string> = {};

  const controller = pickController(analysis.signals, analysis.normalizedText);
  ensureModule(modules, reasons, controller.id, controller.reason);

  analysis.signals.forEach((signal) => {
    SIGNAL_TO_MODULES[signal].forEach(({ id, reason }) => {
      ensureModule(modules, reasons, id, reason);
    });
  });

  analysis.keywords.forEach((keyword) => {
    searchModules(keyword)
      .slice(0, 2)
      .forEach((module) => {
        ensureModule(
          modules,
          reasons,
          module.id,
          `关键词“${keyword}”与该模块元数据匹配。`,
        );
      });
  });

  if (modules.size === 1) {
    getDefaultModuleSet().forEach((module) => {
      ensureModule(
        modules,
        reasons,
        module.id,
        "未识别到足够多的明确需求，补充默认演示模块集合。",
      );
    });
  }

  if (
    !analysis.signals.includes("battery") &&
    !analysis.signals.includes("dcInput")
  ) {
    ensureModule(
      modules,
      reasons,
      "power_protection",
      "默认补充电源保护模块，方便展示完整供电链路。",
    );
  }

  ensureModule(modules, reasons, "base_plate", "默认加入底板，便于组织模块布局。");

  if (analysis.signals.includes("display")) {
    ensureModule(modules, reasons, "shell_body", "显示类终端建议同时展示外壳结构。");
  }

  return {
    analysis,
    modules: [...modules.values()],
    reasons,
  };
}
