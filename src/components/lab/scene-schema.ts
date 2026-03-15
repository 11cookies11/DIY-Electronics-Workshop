"use client";

import type { LayoutView, LayoutZone, ModulePlacement } from "./layout-rules";
import type { AccentType, ModuleComponent } from "./module-registry";

export type SceneModuleNode = {
  id: string;
  type: string;
  label?: string;
  category?: string;
  sceneRole?: string;
  zone?: LayoutZone;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
};

export type SceneConnection = {
  id: string;
  from: string;
  to: string;
  kind: AccentType | "neutral";
};

export type SceneCamera = {
  position: [number, number, number];
  target: [number, number, number];
};

export type SceneJSON = {
  view: LayoutView;
  template?: string;
  theme?: "light" | "dark";
  focus?: string | null;
  highlights?: string[];
  modules: SceneModuleNode[];
  connections: SceneConnection[];
  camera?: SceneCamera;
};

export function placementToSceneNode(
  module: ModuleComponent,
  placement: ModulePlacement,
): SceneModuleNode {
  return {
    id: module.id,
    type: module.id,
    label: module.name,
    category: module.category,
    sceneRole: module.sceneRole,
    zone: placement.zone,
    assembledPosition: placement.assembledPosition,
    explodedPosition: placement.explodedPosition,
  };
}
