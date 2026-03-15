"use client";

import {
  MODULE_IDS,
  MODULE_REGISTRY,
  type ModuleCategory,
  type ModuleComponent,
  type SceneRole,
} from "./module-registry";

export const MODULE_CATALOG = MODULE_IDS.map((id) => MODULE_REGISTRY[id]);

export function getModuleById(id: string) {
  return MODULE_REGISTRY[id] ?? null;
}

export function getModulesByCategory(category: ModuleCategory) {
  return MODULE_CATALOG.filter((module) => module.category === category);
}

export function getModulesBySceneRole(sceneRole: SceneRole) {
  return MODULE_CATALOG.filter((module) => module.sceneRole === sceneRole);
}

export function searchModules(keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return MODULE_CATALOG;
  }

  return MODULE_CATALOG.filter((module) =>
    [module.id, module.name, ...module.keywords].some((entry) =>
      entry.toLowerCase().includes(normalized),
    ),
  );
}

export function getCoreModuleCandidates() {
  return MODULE_CATALOG.filter((module) => module.sceneRole === "core");
}

export function getDefaultModuleSet(): ModuleComponent[] {
  return [
    MODULE_REGISTRY.esp32_board,
    MODULE_REGISTRY.wifi_module,
    MODULE_REGISTRY.temp_humidity_sensor,
    MODULE_REGISTRY.display_panel,
    MODULE_REGISTRY.battery_pack,
    MODULE_REGISTRY.base_plate,
  ].filter(Boolean);
}
