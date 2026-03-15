"use client";

import type { PreviewInput } from "@/engine/preview";

export const PREVIEW_DEVICE_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  input: PreviewInput;
}> = [
  {
    id: "smart-watch",
    label: "智能手表",
    description: "小型方形机身，正面小触控屏，侧边保留充电口和按键开孔。",
    input: {
      shell: "cube",
      shellSize: { width: 48, height: 48, depth: 18 },
      board: {
        placement: "center",
        sizeMm: { width: 30, depth: 22, thickness: 2 },
        grid: { cols: 5, rows: 4 },
      },
      mainScreen: {
        face: "front",
        type: "touch_display",
        sizeMm: { width: 34, height: 34, depth: 4 },
      },
      ports: [
        { face: "right", type: "usb_c", sizeMm: { width: 10, height: 6, depth: 6 } },
        { face: "left", type: "button_cutout", sizeMm: { width: 8, height: 8, depth: 4 } },
      ],
      modules: [
        "esp32_s3",
        { id: "battery", sizeOverride: { width: 22, height: 8, depth: 12 } },
        "bluetooth",
        "imu_sensor",
        "emmc_chip",
        "status_led",
      ],
    },
  },
  {
    id: "desktop-pet",
    label: "桌面宠物",
    description: "桌面陪伴设备，正面大屏，背面保留供电和扩展接口。",
    input: {
      shell: "cuboid",
      shellSize: { width: 92, height: 110, depth: 86 },
      board: {
        placement: "center",
        sizeMm: { width: 70, depth: 54, thickness: 2 },
        grid: { cols: 6, rows: 5 },
      },
      mainScreen: {
        face: "front",
        type: "touch_display",
        sizeMm: { width: 64, height: 64, depth: 5 },
      },
      ports: [
        { face: "back", type: "power_jack", sizeMm: { width: 12, height: 10, depth: 10 } },
        { face: "back", type: "usb_c", sizeMm: { width: 10, height: 6, depth: 6 } },
      ],
      modules: [
        "raspberry_pi_cm5",
        { id: "camera_module", sizeOverride: { width: 28, height: 10, depth: 28 } },
        { id: "microphone_array", sizeOverride: { width: 28, height: 6, depth: 14 } },
        "wifi",
        "bluetooth",
        "status_led",
        "sd_card_slot",
      ],
    },
  },
  {
    id: "bluetooth-speaker",
    label: "蓝牙音响",
    description: "横向音响，前面小状态屏，背部保留电源和音频接口。",
    input: {
      shell: "cuboid",
      shellSize: { width: 160, height: 72, depth: 72 },
      board: {
        placement: "center",
        sizeMm: { width: 118, depth: 42, thickness: 2 },
        grid: { cols: 7, rows: 4 },
      },
      mainScreen: {
        face: "front",
        type: "display_panel",
        sizeMm: { width: 54, height: 22, depth: 4 },
      },
      ports: [
        { face: "back", type: "power_jack", sizeMm: { width: 12, height: 10, depth: 10 } },
        { face: "back", type: "audio_jack", sizeMm: { width: 10, height: 10, depth: 8 } },
        { face: "right", type: "usb_c", sizeMm: { width: 10, height: 6, depth: 6 } },
      ],
      modules: [
        "esp32",
        { id: "battery", sizeOverride: { width: 52, height: 16, depth: 20 } },
        "bluetooth",
        { id: "buzzer", sizeOverride: { width: 20, height: 14, depth: 20 } },
        "audio_jack",
        "button_array",
        "pmic",
      ],
    },
  },
  {
    id: "ir-remote",
    label: "红外遥控器",
    description: "细长手持设备，顶部窄长屏，底部充电口，正面留红外窗口。",
    input: {
      shell: "cuboid",
      shellSize: { width: 46, height: 156, depth: 18 },
      board: {
        placement: "center",
        sizeMm: { width: 28, depth: 12, thickness: 2 },
        grid: { cols: 6, rows: 3 },
      },
      mainScreen: {
        face: "front",
        type: "display_panel",
        sizeMm: { width: 22, height: 68, depth: 4 },
      },
      ports: [
        { face: "bottom", type: "usb_c", sizeMm: { width: 10, height: 6, depth: 6 } },
        { face: "front", type: "ir_window", sizeMm: { width: 12, height: 8, depth: 4 } },
      ],
      modules: [
        "esp32",
        { id: "battery", sizeOverride: { width: 26, height: 10, depth: 14 } },
        "bluetooth",
        "button_array",
        "status_led",
        { id: "infrared_blaster", sizeOverride: { width: 14, height: 8, depth: 12 } },
        "pmic",
        "nor_flash",
      ],
    },
  },
];

export function describePreviewModule(entry: PreviewInput["modules"][number]) {
  if (typeof entry === "string") return entry;
  if (!entry.sizeOverride) return entry.id;

  const width = entry.sizeOverride.width ?? "auto";
  const height = entry.sizeOverride.height ?? "auto";
  const depth = entry.sizeOverride.depth ?? "auto";

  return `${entry.id} (${width} x ${height} x ${depth})`;
}
