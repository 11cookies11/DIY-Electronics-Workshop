"use client";

import {
  createBoardGrid,
  createBoardLayoutHints,
  createBoardSpec,
  placeModules,
} from "./boardGrid";
import { applyPreviewView } from "./exploded";
import { createFaceGrid, placeMainScreen, placePorts } from "./faceGrid";
import { faceGridToWorldPosition, getFaceRotation } from "./faceTransform";
import { getPreviewModules } from "./moduleRegistry";
import { createConstrainedPose, createPose } from "./nodePose";
import { buildShellGeometry } from "./shellGeometry";
import type {
  FaceName,
  PlacementZone,
  PreviewConnection,
  PreviewInput,
  PreviewScene,
  PreviewView,
  ResolvedModuleDefinition,
  SceneNode,
  SceneNodeConstraint,
} from "./types";

function createVisualDimensions(size: [number, number, number]) {
  return {
    visual: {
      width: size[0],
      height: size[1],
      depth: size[2],
    },
    footprint: {
      width: size[0],
      depth: size[2],
    },
  } satisfies SceneNode["dimensions"];
}

function isShellInteractionModule(sourceId: string) {
  return sourceId === "button_array";
}

function createShellInteractionNodes(
  shellModules: ResolvedModuleDefinition[],
  input: PreviewInput,
  screenPlacement: ReturnType<typeof placeMainScreen>["item"] | null,
): SceneNode[] {
  if (shellModules.length === 0) {
    return [];
  }

  return shellModules.map((module, index) => {
    const face: FaceName = input.mainScreen?.face ?? "front";
    const grid = createFaceGrid(face, 4, 6);
    const size: [number, number, number] = [
      module.sizeMm.width,
      module.sizeMm.depth,
      Math.min(module.sizeMm.height, 4),
    ];
    const gridW = Math.min(grid.cols, Math.max(1, Math.round((size[0] / input.shellSize.width) * grid.cols)));
    const gridH = Math.min(grid.rows, Math.max(1, Math.round((size[1] / input.shellSize.height) * grid.rows)));
    const gridX = Math.max(0, Math.floor((grid.cols - gridW) / 2));
    const screenBottom =
      screenPlacement && screenPlacement.face === face
        ? screenPlacement.gridY + screenPlacement.gridH
        : Math.floor(grid.rows / 2) - 1;
    const preferredRow =
      face === "front"
        ? Math.min(grid.rows - gridH, screenBottom + index)
        : Math.max(0, Math.floor((grid.rows - gridH) / 2));
    const gridY = Math.max(0, preferredRow);
    const constraints = createPortConstraint(face);
    const position = faceGridToWorldPosition(
      input.shellSize,
      face,
      grid,
      gridX,
      gridY,
      gridW,
      gridH,
      size[2],
    );

    return {
      id: `shell-interaction:${module.id}`,
      type: module.id,
      pose: createConstrainedPose(
        position,
        constraints,
        getFaceRotation(face),
      ),
      position,
      rotation: getFaceRotation(face),
      size,
      dimensions: createVisualDimensions(size),
      constraints,
      meta: {
        layer: "port",
        face,
        componentType: module.id,
        sourceId: module.sourceId,
      },
    };
  });
}

function inferDeviceLayoutTemplate(input: PreviewInput) {
  if (
    input.shellSize.width <= 60 &&
    input.shellSize.height <= 60 &&
    input.shellSize.depth <= 22 &&
    input.mainScreen?.face === "front"
  ) {
    return "smart-watch" as const;
  }

  if (
    input.shellSize.height >= input.shellSize.width * 2.4 &&
    input.shellSize.depth <= 24 &&
    input.ports?.some((port) => port.type === "ir_window")
  ) {
    return "ir-remote" as const;
  }

  return "default" as const;
}

function applyDeviceLayoutTemplate(
  input: PreviewInput,
  modules: ResolvedModuleDefinition[],
) {
  const template = inferDeviceLayoutTemplate(input);

  if (template === "default") {
    return modules;
  }

  return modules.map((module) => {
    const sourceId = module.sourceId ?? module.id;
    const patch: Partial<ResolvedModuleDefinition> = {};

    if (template === "smart-watch") {
      if (sourceId === "battery") {
        patch.preferredZone = "bottom";
        patch.placementPriority = 10;
      } else if (
        sourceId === "esp32" ||
        sourceId === "esp32_s3" ||
        sourceId === "stm32"
      ) {
        patch.preferredZone = "center";
        patch.placementPriority = 10;
      } else if (
        sourceId === "bluetooth" ||
        sourceId === "wifi" ||
        sourceId === "gps"
      ) {
        patch.preferredZone = "top";
        patch.placementPriority = 10;
      } else if (sourceId === "imu_sensor") {
        patch.preferredZone = "center";
        patch.placementPriority = 20;
      } else if (
        sourceId === "emmc_chip" ||
        sourceId === "nor_flash" ||
        sourceId === "nand_flash" ||
        sourceId === "eeprom"
      ) {
        patch.preferredZone = "bottom";
        patch.placementPriority = 30;
      } else if (sourceId === "status_led") {
        patch.preferredZone = "edge";
        patch.placementPriority = 40;
      }
    }

    if (template === "ir-remote") {
      if (sourceId === "infrared_blaster") {
        patch.preferredZone = "top";
        patch.placementPriority = 10;
      } else if (sourceId === "battery") {
        patch.preferredZone = "bottom";
        patch.placementPriority = 10;
      } else if (
        sourceId === "esp32" ||
        sourceId === "esp32_s3" ||
        sourceId === "stm32"
      ) {
        patch.preferredZone = "center";
        patch.placementPriority = 10;
      } else if (
        sourceId === "bluetooth" ||
        sourceId === "wifi"
      ) {
        patch.preferredZone = "top";
        patch.placementPriority = 20;
      } else if (sourceId === "pmic") {
        patch.preferredZone = "bottom";
        patch.placementPriority = 20;
      } else if (sourceId === "button_array") {
        patch.preferredZone = "center";
        patch.placementPriority = 30;
      } else if (sourceId === "status_led") {
        patch.preferredZone = "top";
        patch.placementPriority = 40;
      }
    }

    return Object.keys(patch).length > 0 ? { ...module, ...patch } : module;
  });
}

function createBoardConstraint(face: FaceName): SceneNodeConstraint {
  return {
    placement: {
      anchorNodeId: "shell",
      anchorFace: face,
      selfMountFace: "bottom",
      preferredZone: "center",
    },
    pose: {
      upFace: "top",
    },
    collision: {
      clearance: 0,
      footprintPadding: 0,
      bodyPadding: 0,
    },
    priority: 1000,
  };
}

function getOppositeFace(face: FaceName): FaceName {
  switch (face) {
    case "front":
      return "back";
    case "back":
      return "front";
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    default:
      return face;
  }
}

function createModuleConstraint(
  sourceId: string,
  category: unknown,
  zone: unknown,
  boardFace: FaceName,
  keepoutCells?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  },
): SceneNodeConstraint {
  const normalizedCategory = String(category ?? "");
  const normalizedZone = String(zone ?? "center");
  const isCamera = sourceId === "camera_module";
  const preferredZone: PlacementZone =
    normalizedZone === "top" ||
    normalizedZone === "bottom" ||
    normalizedZone === "left" ||
    normalizedZone === "right" ||
    normalizedZone === "edge"
      ? normalizedZone
      : "center";

  return {
    placement: {
      anchorNodeId: "main-board",
      anchorFace: boardFace,
      selfMountFace: "bottom",
      preferredZone,
    },
    pose: {
      upFace: "top",
      functionalFace: isCamera ? "front" : undefined,
      targetDirection: isCamera ? "deviceFront" : undefined,
    },
    collision: {
      clearance:
        normalizedCategory === "core" ? 5 :
        normalizedCategory === "power" ? 4 :
        normalizedCategory === "communication" ? 4 :
        3,
      footprintPadding: normalizedCategory === "core" ? 2 : 1,
      bodyPadding: 1,
      keepout: keepoutCells,
    },
    priority:
      normalizedCategory === "core" ? 900 :
      normalizedCategory === "power" ? 800 :
      normalizedCategory === "communication" ? 700 :
      500,
  };
}

function createScreenConstraint(face: FaceName): SceneNodeConstraint {
  return {
    placement: {
      anchorNodeId: "shell",
      anchorFace: face,
      selfMountFace: "back",
      preferredZone: "center",
    },
    pose: {
      functionalFace: "front",
      targetDirection: "outward",
    },
    collision: {
      clearance: 2,
      bodyPadding: 1,
      keepout: {
        back: 10,
      },
    },
    priority: 950,
  };
}

function getPortMountFace(face: FaceName) {
  return face === "front" || face === "back" ? "back" : "bottom";
}

function createPortConstraint(face: FaceName): SceneNodeConstraint {
  return {
    placement: {
      anchorNodeId: "shell",
      anchorFace: face,
      selfMountFace: getPortMountFace(face),
      preferredZone: "edge",
    },
    pose: {
      functionalFace: "front",
      targetDirection: "outward",
    },
    collision: {
      clearance: 2,
      bodyPadding: 1,
      keepout: {
        front: 12,
      },
    },
    priority: 850,
  };
}

function createShellNode(input: PreviewInput): SceneNode {
  const shell = buildShellGeometry(input.shell, input.shellSize);
  const size: [number, number, number] = [shell.size.width, shell.size.height, shell.size.depth];

  return {
    id: "shell",
    type: input.shell,
    pose: createPose(shell.center),
    position: shell.center,
    size,
    dimensions: createVisualDimensions(size),
    meta: {
      layer: "shell",
      shellType: input.shell,
    },
  };
}

function createBoardNode(
  input: PreviewInput,
  modules: ReturnType<typeof getPreviewModules>,
): SceneNode {
  const board = createBoardSpec(
    input.shellSize,
    input.board,
    modules,
    input.mainScreen,
  );
  const size: [number, number, number] = [board.width, board.thickness, board.depth];

  return {
    id: "main-board",
    type: "main-board",
    pose: createPose(board.center, board.rotation),
    position: board.center,
    rotation: board.rotation,
    size,
    dimensions: createVisualDimensions(size),
    constraints: createBoardConstraint(board.mountFace),
    meta: {
      layer: "board",
      placement: input.board.placement,
      face: board.mountFace,
      cols: board.cols,
      rows: board.rows,
    },
  };
}

function getConnectionKind(category: unknown): PreviewConnection["kind"] {
  switch (String(category ?? "")) {
    case "power":
      return "power";
    case "sensor":
    case "storage":
      return "data";
    case "communication":
    case "actuator":
      return "signal";
    default:
      return "interface";
  }
}

export function buildPreviewScene(
  input: PreviewInput,
  view: PreviewView = "assembled",
): PreviewScene {
  const modules = applyDeviceLayoutTemplate(
    input,
    getPreviewModules(input.modules),
  );
  const shellModules = modules.filter((module) =>
    isShellInteractionModule(module.sourceId ?? module.id),
  );
  const boardModules = modules.filter(
    (module) => !isShellInteractionModule(module.sourceId ?? module.id),
  );
  const screenPlacement = input.mainScreen
    ? placeMainScreen(input.mainScreen, input.shellSize).item
    : null;
  const portPlacements = placePorts(input.ports ?? [], input.shellSize);
  const boardSpec = createBoardSpec(
    input.shellSize,
    input.board,
    boardModules,
    input.mainScreen,
  );
  const boardGrid = createBoardGrid(boardSpec.cols, boardSpec.rows);
  const boardLayoutHints = createBoardLayoutHints(
    boardSpec,
    input.shellSize,
    screenPlacement,
    portPlacements,
  );
  const placedModules = placeModules(
    boardGrid,
    boardSpec,
    boardModules,
    boardLayoutHints,
  );

  const moduleNodes: SceneNode[] = placedModules.map((module) => {
    const definition = boardModules.find((entry) => entry.id === module.id);
    const constraints = createModuleConstraint(
      definition?.sourceId ?? module.type,
      definition?.category,
      module.zone,
      getOppositeFace(boardSpec.mountFace),
      definition?.keepoutCells,
    );
    const pose = createConstrainedPose(
      module.worldPosition,
      constraints,
      boardSpec.rotation,
    );

    return {
      id: module.id,
      type: module.type,
      pose,
      position: pose.position,
      rotation: pose.rotation,
      size: module.sizeMm,
      dimensions: createVisualDimensions(module.sizeMm),
      constraints,
      meta: {
        layer: "module",
        category: definition?.category,
        shape: definition?.shape,
        sourceId: definition?.sourceId,
        zone: module.zone,
        gridX: module.gridX,
        gridY: module.gridY,
        gridW: module.gridW,
        gridH: module.gridH,
      },
    };
  });

  const screenNodes: SceneNode[] = screenPlacement
    ? [
        (() => {
          const constraints = createScreenConstraint(screenPlacement.face);

          return {
          id: screenPlacement.id,
          type: screenPlacement.componentType ?? "screen",
          pose: createConstrainedPose(
            screenPlacement.worldPosition,
            constraints,
            screenPlacement.rotation,
          ),
          position: screenPlacement.worldPosition,
          rotation: screenPlacement.rotation,
          size: screenPlacement.sizeMm,
          dimensions: createVisualDimensions(screenPlacement.sizeMm),
          constraints,
          meta: {
            layer: "screen",
            face: screenPlacement.face,
            componentType: screenPlacement.componentType ?? "display_panel",
          },
        };
        })(),
      ]
    : [];

  const portNodes: SceneNode[] = portPlacements.map((port) => {
    const constraints = createPortConstraint(port.face);

    return {
      id: port.id,
      type: port.componentType ?? "port",
      pose: createConstrainedPose(port.worldPosition, constraints, port.rotation),
      position: port.worldPosition,
      rotation: port.rotation,
      size: port.sizeMm,
      dimensions: createVisualDimensions(port.sizeMm),
      constraints,
      meta: {
        layer: "port",
        face: port.face,
        componentType: port.componentType ?? "usb_c",
      },
    };
  });
  const shellInteractionNodes = createShellInteractionNodes(
    shellModules,
    input,
    screenPlacement,
  );

  const connections: PreviewConnection[] = [
    ...moduleNodes.map((node) => ({
      id: `link-board-${node.id}`,
      fromId: "main-board",
      toId: node.id,
      kind: getConnectionKind(node.meta?.category),
    })),
    ...screenNodes.map((node) => ({
      id: `link-board-${node.id}`,
      fromId: "main-board",
      toId: node.id,
      kind: "signal" as const,
    })),
    ...portNodes.map((node) => ({
      id: `link-board-${node.id}`,
      fromId: "main-board",
      toId: node.id,
      kind: "interface" as const,
    })),
  ];

  const scene: PreviewScene = {
    view: "assembled",
    shellNode: createShellNode(input),
    boardNode: createBoardNode(input, modules),
    moduleNodes,
    screenNodes,
    portNodes: [...portNodes, ...shellInteractionNodes],
    connections,
  };

  return applyPreviewView(scene, view);
}
