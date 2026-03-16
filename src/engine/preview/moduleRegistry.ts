"use client";

import type { ModuleDefinition, ResolvedModuleDefinition } from "./types";

export type PreviewModuleId =
  | "esp32"
  | "esp32_s3"
  | "stm32"
  | "raspberry_pi_cm5"
  | "wifi"
  | "bluetooth"
  | "ethernet"
  | "rs485"
  | "can"
  | "lte_4g"
  | "gps"
  | "nor_flash"
  | "nand_flash"
  | "eeprom"
  | "sd_card_slot"
  | "emmc_chip"
  | "nvme_ssd"
  | "sram_chip"
  | "usb_c_port"
  | "hdmi_port"
  | "rj45_port"
  | "terminal_block"
  | "audio_jack"
  | "heatsink"
  | "cooling_fan"
  | "antenna"
  | "mount_hole"
  | "shield_can"
  | "battery"
  | "dc_input"
  | "usb_c_power"
  | "buck_converter"
  | "pmic"
  | "temp_sensor"
  | "humidity_sensor"
  | "pressure_sensor"
  | "light_sensor"
  | "imu_sensor"
  | "distance_sensor"
  | "camera_module"
  | "microphone_array"
  | "gas_sensor"
  | "current_sensor"
  | "hall_sensor"
  | "relay_module"
  | "motor_driver"
  | "servo_driver"
  | "led_driver"
  | "infrared_blaster"
  | "buzzer"
  | "solenoid_driver"
  | "display_panel"
  | "touch_display"
  | "button_array"
  | "status_led";

const MODULES: ModuleDefinition[] = [
  {
    id: "esp32",
    category: "core",
    gridW: 2,
    gridH: 2,
    sizeMm: { width: 28, height: 8, depth: 28 },
    preferredZone: "center",
    shape: "board",
  },
  {
    id: "stm32",
    category: "core",
    gridW: 2,
    gridH: 2,
    sizeMm: { width: 32, height: 8, depth: 28 },
    preferredZone: "center",
    shape: "board",
  },
  {
    id: "esp32_s3",
    category: "core",
    gridW: 2,
    gridH: 2,
    sizeMm: { width: 30, height: 8, depth: 28 },
    preferredZone: "center",
    shape: "board",
  },
  {
    id: "raspberry_pi_cm5",
    category: "core",
    gridW: 3,
    gridH: 2,
    placementPriority: 40,
    sizeMm: { width: 55, height: 10, depth: 40 },
    preferredZone: "center",
    shape: "board",
  },
  {
    id: "wifi",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 6, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "bluetooth",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 6, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "ethernet",
    category: "communication",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 22, height: 13, depth: 18 },
    preferredZone: "top",
    shape: "box",
  },
  {
    id: "rs485",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 9, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "can",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 9, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "lte_4g",
    category: "communication",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 24, height: 8, depth: 18 },
    preferredZone: "top",
    shape: "box",
  },
  {
    id: "gps",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 16, height: 6, depth: 16 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "nor_flash",
    category: "storage",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 4, depth: 10 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "nand_flash",
    category: "storage",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 4, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "eeprom",
    category: "storage",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 8, height: 4, depth: 8 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "sd_card_slot",
    category: "storage",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 16, height: 6, depth: 18 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "emmc_chip",
    category: "storage",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 4, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "nvme_ssd",
    category: "storage",
    gridW: 3,
    gridH: 1,
    sizeMm: { width: 80, height: 6, depth: 22 },
    preferredZone: "top",
    shape: "board",
  },
  {
    id: "sram_chip",
    category: "storage",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 4, depth: 10 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "usb_c_port",
    category: "interface",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 8, depth: 8 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "hdmi_port",
    category: "interface",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 8, depth: 10 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "rj45_port",
    category: "interface",
    gridW: 2,
    gridH: 1,
    keepoutCells: { top: 1 },
    sizeMm: { width: 16, height: 13, depth: 21 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "terminal_block",
    category: "interface",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 18, height: 11, depth: 12 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "audio_jack",
    category: "interface",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 10, depth: 12 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "heatsink",
    category: "thermal",
    gridW: 2,
    gridH: 1,
    placementPriority: 45,
    keepoutCells: { left: 1, right: 1 },
    sizeMm: { width: 18, height: 10, depth: 18 },
    preferredZone: "center",
    shape: "box",
  },
  {
    id: "cooling_fan",
    category: "thermal",
    gridW: 2,
    gridH: 2,
    placementPriority: 55,
    keepoutCells: { left: 1, right: 1, top: 1 },
    sizeMm: { width: 30, height: 12, depth: 30 },
    preferredZone: "top",
    shape: "box",
  },
  {
    id: "antenna",
    category: "mechanical",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 8, height: 24, depth: 8 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "mount_hole",
    category: "mechanical",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 6, height: 2, depth: 6 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "shield_can",
    category: "mechanical",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 16, height: 6, depth: 16 },
    preferredZone: "center",
    shape: "box",
  },
  {
    id: "battery",
    category: "power",
    gridW: 2,
    gridH: 1,
    placementPriority: 50,
    keepoutCells: { top: 1 },
    sizeMm: { width: 34, height: 12, depth: 18 },
    preferredZone: "bottom",
    shape: "box",
  },
  {
    id: "dc_input",
    category: "power",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 10, depth: 12 },
    preferredZone: "bottom",
    shape: "box",
  },
  {
    id: "usb_c_power",
    category: "power",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 8, depth: 10 },
    preferredZone: "bottom",
    shape: "box",
  },
  {
    id: "buck_converter",
    category: "power",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 24, height: 9, depth: 16 },
    preferredZone: "bottom",
    shape: "board",
  },
  {
    id: "pmic",
    category: "power",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "bottom",
    shape: "chip",
  },
  {
    id: "temp_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "humidity_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "pressure_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "light_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "imu_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 6, depth: 12 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "distance_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    keepoutCells: { top: 1 },
    sizeMm: { width: 12, height: 10, depth: 12 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "camera_module",
    category: "sensor",
    gridW: 2,
    gridH: 2,
    placementPriority: 60,
    keepoutCells: { top: 1 },
    sizeMm: { width: 24, height: 10, depth: 24 },
    preferredZone: "edge",
    shape: "panel",
  },
  {
    id: "microphone_array",
    category: "sensor",
    gridW: 2,
    gridH: 1,
    keepoutCells: { top: 1 },
    sizeMm: { width: 24, height: 6, depth: 12 },
    preferredZone: "edge",
    shape: "board",
  },
  {
    id: "gas_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 16, height: 8, depth: 16 },
    preferredZone: "edge",
    shape: "box",
  },
  {
    id: "current_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 12, height: 8, depth: 12 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "hall_sensor",
    category: "sensor",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 6, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "relay_module",
    category: "actuator",
    gridW: 2,
    gridH: 1,
    placementPriority: 70,
    keepoutCells: { top: 1 },
    sizeMm: { width: 28, height: 10, depth: 16 },
    preferredZone: "right",
    shape: "box",
  },
  {
    id: "motor_driver",
    category: "actuator",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 28, height: 10, depth: 18 },
    preferredZone: "right",
    shape: "board",
  },
  {
    id: "servo_driver",
    category: "actuator",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 24, height: 10, depth: 16 },
    preferredZone: "right",
    shape: "board",
  },
  {
    id: "led_driver",
    category: "actuator",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 8, depth: 12 },
    preferredZone: "right",
    shape: "chip",
  },
  {
    id: "infrared_blaster",
    category: "actuator",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 10, height: 8, depth: 10 },
    preferredZone: "edge",
    shape: "chip",
  },
  {
    id: "buzzer",
    category: "actuator",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 10, depth: 14 },
    preferredZone: "right",
    shape: "box",
  },
  {
    id: "solenoid_driver",
    category: "actuator",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 28, height: 10, depth: 18 },
    preferredZone: "right",
    shape: "board",
  },
  {
    id: "display_panel",
    category: "other",
    gridW: 2,
    gridH: 2,
    sizeMm: { width: 54, height: 4, depth: 34 },
    preferredZone: "any",
    shape: "panel",
  },
  {
    id: "touch_display",
    category: "other",
    gridW: 2,
    gridH: 2,
    sizeMm: { width: 62, height: 5, depth: 38 },
    preferredZone: "any",
    shape: "panel",
  },
  {
    id: "button_array",
    category: "other",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 22, height: 8, depth: 14 },
    preferredZone: "any",
    shape: "panel",
  },
  {
    id: "status_led",
    category: "other",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 8, height: 6, depth: 8 },
    preferredZone: "any",
    shape: "chip",
  },
];

export const PREVIEW_MODULE_REGISTRY: Record<PreviewModuleId, ModuleDefinition> =
  MODULES.reduce<Record<PreviewModuleId, ModuleDefinition>>((acc, module) => {
    acc[module.id as PreviewModuleId] = module;
    return acc;
  }, {} as Record<PreviewModuleId, ModuleDefinition>);

export const PREVIEW_MODULE_IDS = MODULES.map((module) => module.id as PreviewModuleId);

export function getPreviewModule(id: string) {
  return PREVIEW_MODULE_REGISTRY[id as PreviewModuleId] ?? null;
}

export function getPreviewModules(
  entries: Array<
    | string
    | {
        id: string;
        sizeOverride?: {
          width?: number;
          height?: number;
          depth?: number;
        };
      }
  >,
) {
  return entries
    .map((entry) => {
      const moduleId = typeof entry === "string" ? entry : entry.id;
      const module = getPreviewModule(moduleId);

      if (!module) {
        return null;
      }

      if (typeof entry === "string" || !entry.sizeOverride) {
        return {
          ...module,
          sourceId: module.id,
        } satisfies ResolvedModuleDefinition;
      }

      return {
        ...module,
        sourceId: module.id,
        sizeMm: {
          width: entry.sizeOverride.width ?? module.sizeMm.width,
          height: entry.sizeOverride.height ?? module.sizeMm.height,
          depth: entry.sizeOverride.depth ?? module.sizeMm.depth,
        },
      } satisfies ResolvedModuleDefinition;
    })
    .filter((module): module is ResolvedModuleDefinition => Boolean(module));
}
