"use client";

import type { ModuleDefinition } from "./types";

export type PreviewModuleId =
  | "esp32"
  | "stm32"
  | "wifi"
  | "battery"
  | "temp_sensor"
  | "humidity_sensor"
  | "relay_module"
  | "display_panel";

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
    id: "wifi",
    category: "communication",
    gridW: 1,
    gridH: 1,
    sizeMm: { width: 14, height: 6, depth: 12 },
    preferredZone: "top",
    shape: "chip",
  },
  {
    id: "battery",
    category: "power",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 34, height: 12, depth: 18 },
    preferredZone: "bottom",
    shape: "box",
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
    id: "relay_module",
    category: "actuator",
    gridW: 2,
    gridH: 1,
    sizeMm: { width: 28, height: 10, depth: 16 },
    preferredZone: "right",
    shape: "box",
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

export function getPreviewModules(ids: string[]) {
  return ids
    .map((id) => getPreviewModule(id))
    .filter((module): module is ModuleDefinition => Boolean(module));
}
