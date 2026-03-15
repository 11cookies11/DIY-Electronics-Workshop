"use client";

import { createBoardGrid, createBoardSpec, placeModules } from "./boardGrid";
import { applyPreviewView } from "./exploded";
import { placeMainScreen, placePorts } from "./faceGrid";
import { getPreviewModules } from "./moduleRegistry";
import { buildShellGeometry } from "./shellGeometry";
import type {
  PreviewConnection,
  PreviewInput,
  PreviewScene,
  PreviewView,
  SceneNode,
} from "./types";

function createShellNode(input: PreviewInput): SceneNode {
  const shell = buildShellGeometry(input.shell, input.shellSize);

  return {
    id: "shell",
    type: input.shell,
    position: shell.center,
    size: [shell.size.width, shell.size.height, shell.size.depth],
    meta: {
      layer: "shell",
      shellType: input.shell,
    },
  };
}

function createBoardNode(input: PreviewInput): SceneNode {
  const board = createBoardSpec(input.shellSize, input.board);

  return {
    id: "main-board",
    type: "main-board",
    position: board.center,
    size: [board.width, board.thickness, board.depth],
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

  const moduleNodes: SceneNode[] = placedModules.map((module) => ({
    id: module.id,
    type: module.type,
    position: module.worldPosition,
    size: module.sizeMm,
    meta: {
      layer: "module",
      category: modules.find((entry) => entry.id === module.id)?.category,
      shape: modules.find((entry) => entry.id === module.id)?.shape,
      sourceId: modules.find((entry) => entry.id === module.id)?.sourceId,
      zone: module.zone,
      gridX: module.gridX,
      gridY: module.gridY,
      gridW: module.gridW,
      gridH: module.gridH,
    },
  }));

  const screenPlacement = input.mainScreen
    ? placeMainScreen(input.mainScreen, input.shellSize).item
    : null;
  const portPlacements = placePorts(input.ports ?? [], input.shellSize);

  const screenNodes: SceneNode[] = screenPlacement
    ? [
        {
          id: screenPlacement.id,
          type: screenPlacement.componentType ?? "screen",
          position: screenPlacement.worldPosition,
          rotation: screenPlacement.rotation,
          size: screenPlacement.sizeMm,
          meta: {
            layer: "screen",
            face: screenPlacement.face,
            componentType: screenPlacement.componentType ?? "display_panel",
          },
        },
      ]
    : [];

  const portNodes: SceneNode[] = portPlacements.map((port) => ({
    id: port.id,
    type: port.componentType ?? "port",
    position: port.worldPosition,
    rotation: port.rotation,
    size: port.sizeMm,
    meta: {
      layer: "port",
      face: port.face,
      componentType: port.componentType ?? "usb_c",
    },
  }));

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
