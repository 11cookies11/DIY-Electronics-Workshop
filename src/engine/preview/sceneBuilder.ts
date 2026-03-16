"use client";

import { createBoardGrid, createBoardSpec, placeModules } from "./boardGrid";
import { applyPreviewView } from "./exploded";
import { placeMainScreen, placePorts } from "./faceGrid";
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

function createBoardConstraint(): SceneNodeConstraint {
  return {
    placement: {
      anchorNodeId: "shell",
      anchorFace: "bottom",
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

function createModuleConstraint(
  sourceId: string,
  category: unknown,
  zone: unknown,
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
      anchorFace: "top",
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

function createBoardNode(input: PreviewInput): SceneNode {
  const board = createBoardSpec(input.shellSize, input.board);
  const size: [number, number, number] = [board.width, board.thickness, board.depth];

  return {
    id: "main-board",
    type: "main-board",
    pose: createPose(board.center),
    position: board.center,
    size,
    dimensions: createVisualDimensions(size),
    constraints: createBoardConstraint(),
    meta: {
      layer: "board",
      placement: input.board.placement,
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
  const boardSpec = createBoardSpec(input.shellSize, input.board);
  const boardGrid = createBoardGrid(boardSpec.cols, boardSpec.rows);
  const modules = getPreviewModules(input.modules);
  const placedModules = placeModules(boardGrid, boardSpec, modules);

  const moduleNodes: SceneNode[] = placedModules.map((module) => {
    const definition = modules.find((entry) => entry.id === module.id);
    const constraints = createModuleConstraint(
      definition?.sourceId ?? module.type,
      definition?.category,
      module.zone,
      definition?.keepoutCells,
    );

    return {
      id: module.id,
      type: module.type,
      pose: createConstrainedPose(module.worldPosition, constraints),
      position: module.worldPosition,
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

  const screenPlacement = input.mainScreen
    ? placeMainScreen(input.mainScreen, input.shellSize).item
    : null;
  const portPlacements = placePorts(input.ports ?? [], input.shellSize);

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
    boardNode: createBoardNode(input),
    moduleNodes,
    screenNodes,
    portNodes,
    connections,
  };

  return applyPreviewView(scene, view);
}
