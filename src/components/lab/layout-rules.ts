"use client";

import {
  getDefaultModuleSet,
  getModuleById,
} from "./module-catalog";
import type {
  ModuleCategory,
  ModuleComponent,
  PreferredPlacement,
  SceneRole,
} from "./module-registry";

export type LayoutView = "assembled" | "exploded";

export type LayoutZone =
  | "core"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "front"
  | "rear"
  | "outer";

export type ModulePlacement = {
  moduleId: string;
  zone: LayoutZone;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
};

export type LayoutResult = {
  modules: ModulePlacement[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
};

type ZoneCursor = Record<LayoutZone, number>;

const ZONE_BASE_POSITIONS: Record<LayoutZone, [number, number, number]> = {
  core: [0, 0, 0],
  top: [0, 0.9, 0],
  bottom: [0, -0.9, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  front: [0, 0, 0.9],
  rear: [0, 0, -0.9],
  outer: [1.2, 0.25, 0],
};

const ZONE_EXPLODED_POSITIONS: Record<LayoutZone, [number, number, number]> = {
  core: [0, 0.2, 0],
  top: [0, 2.1, 0],
  bottom: [0, -2.1, 0],
  left: [-2.2, 0.3, 0],
  right: [2.2, 0.3, 0],
  front: [0, 0.2, 2.2],
  rear: [0, 0.2, -2],
  outer: [2.3, 0.9, 0.2],
};

const ZONE_STACK_AXIS: Record<LayoutZone, 0 | 1 | 2> = {
  core: 0,
  top: 0,
  bottom: 0,
  left: 1,
  right: 1,
  front: 0,
  rear: 0,
  outer: 1,
};

const DEFAULT_ZONE_BY_PLACEMENT: Record<PreferredPlacement, LayoutZone> = {
  center: "core",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
  front: "front",
  rear: "rear",
  outer: "outer",
};

const CATEGORY_PRIORITY: Record<ModuleCategory, number> = {
  controller: 1,
  power: 2,
  communication: 3,
  sensor: 4,
  actuator: 5,
  ui: 6,
  structure: 7,
  visual: 8,
};

const ROLE_PRIORITY: Record<SceneRole, number> = {
  core: 1,
  support: 2,
  io: 3,
  display: 4,
  shell: 5,
};

function createZoneCursor(): ZoneCursor {
  return {
    core: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    front: 0,
    rear: 0,
    outer: 0,
  };
}

function sizeOffset(module: ModuleComponent) {
  if (module.size === "s") {
    return 0.28;
  }
  if (module.size === "m") {
    return 0.4;
  }
  return 0.56;
}

function getTargetZone(module: ModuleComponent): LayoutZone {
  if (module.sceneRole === "core") {
    return "core";
  }

  if (module.category === "power") {
    return "bottom";
  }

  if (module.category === "communication") {
    return module.preferredPlacement === "rear" ? "rear" : "top";
  }

  if (module.category === "sensor") {
    return module.preferredPlacement === "front" ? "front" : "outer";
  }

  if (module.category === "ui") {
    return "front";
  }

  if (module.category === "actuator") {
    return "right";
  }

  if (module.category === "structure") {
    return module.preferredPlacement === "top" ? "top" : "outer";
  }

  return DEFAULT_ZONE_BY_PLACEMENT[module.preferredPlacement];
}

function withOffset(
  base: [number, number, number],
  axis: 0 | 1 | 2,
  amount: number,
): [number, number, number] {
  const next: [number, number, number] = [...base];
  next[axis] += amount;
  return next;
}

function compareModules(a: ModuleComponent, b: ModuleComponent) {
  return (
    ROLE_PRIORITY[a.sceneRole] - ROLE_PRIORITY[b.sceneRole] ||
    CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
    a.name.localeCompare(b.name)
  );
}

function calculateBounds(modules: ModulePlacement[]) {
  if (modules.length === 0) {
    return {
      min: [0, 0, 0] as [number, number, number],
      max: [0, 0, 0] as [number, number, number],
    };
  }

  const points = modules.flatMap((module) => [
    module.assembledPosition,
    module.explodedPosition,
  ]);

  const min: [number, number, number] = [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.min(...points.map((point) => point[2])),
  ];
  const max: [number, number, number] = [
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[2])),
  ];

  return { min, max };
}

export function buildLayoutResult(modules: ModuleComponent[]): LayoutResult {
  const zoneCursor = createZoneCursor();

  const placements = [...modules]
    .sort(compareModules)
    .map<ModulePlacement>((module) => {
      const zone = getTargetZone(module);
      const axis = ZONE_STACK_AXIS[zone];
      const offsetStep = sizeOffset(module);
      const index = zoneCursor[zone];
      zoneCursor[zone] += 1;

      const assembledPosition = withOffset(
        ZONE_BASE_POSITIONS[zone],
        axis,
        (index - Math.floor(index / 2)) * offsetStep,
      );
      const explodedPosition = withOffset(
        ZONE_EXPLODED_POSITIONS[zone],
        axis,
        (index - Math.floor(index / 2)) * (offsetStep + 0.18),
      );

      return {
        moduleId: module.id,
        zone,
        assembledPosition,
        explodedPosition,
      };
    });

  return {
    modules: placements,
    bounds: calculateBounds(placements),
  };
}

export function buildLayoutFromIds(moduleIds: string[]) {
  const modules = moduleIds
    .map((id) => getModuleById(id))
    .filter((module): module is ModuleComponent => Boolean(module));

  return buildLayoutResult(modules);
}

export function getDefaultLayoutResult() {
  return buildLayoutResult(getDefaultModuleSet());
}
