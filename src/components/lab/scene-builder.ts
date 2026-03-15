"use client";

import { buildLayoutResult } from "./layout-rules";
import { selectModulesForRequirement } from "./module-selector";
import {
  placementToSceneNode,
  type SceneConnection,
  type SceneJSON,
} from "./scene-schema";
import type { ModuleComponent } from "./module-registry";

const ACCENT_TO_CONNECTION: Record<
  NonNullable<ModuleComponent["visualStyle"]["accentType"]>,
  SceneConnection["kind"]
> = {
  data: "data",
  power: "power",
  signal: "signal",
  neutral: "neutral",
};

function buildConnections(modules: ModuleComponent[]): SceneConnection[] {
  const primaryCore = modules.find((module) => module.sceneRole === "core");

  if (!primaryCore) {
    return [];
  }

  return modules
    .filter((module) => module.id !== primaryCore.id)
    .map((module) => ({
      id: `${module.id}->${primaryCore.id}`,
      from: module.id,
      to: primaryCore.id,
      kind: ACCENT_TO_CONNECTION[module.visualStyle.accentType ?? "neutral"],
    }));
}

export function buildSceneFromModules(modules: ModuleComponent[]): SceneJSON {
  const layout = buildLayoutResult(modules);
  const nodes = layout.modules
    .map((placement) => {
      const module = modules.find((item) => item.id === placement.moduleId);
      if (!module) {
        return null;
      }

      return placementToSceneNode(module, placement);
    })
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return {
    view: "exploded",
    modules: nodes,
    connections: buildConnections(modules),
    camera: {
      position: [5.2, 3.8, 6.1],
      target: [0, 0.3, 0],
    },
  };
}

export function buildSceneFromRequirement(text: string) {
  const selection = selectModulesForRequirement(text);

  return {
    selection,
    scene: buildSceneFromModules(selection.modules),
  };
}
