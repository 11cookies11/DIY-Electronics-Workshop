"use client";

import { createBoardGrid, createBoardSpec, placeModules } from "./boardGrid";
import { applyPreviewView } from "./exploded";
import { placeMainScreen, placePorts } from "./faceGrid";
import { getPreviewModules } from "./moduleRegistry";
import { buildShellGeometry } from "./shellGeometry";
import type {
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
  const board = createBoardSpec(input.shellSize);

  return {
    id: "main-board",
    type: "main-board",
    position: board.center,
    size: [board.width, board.thickness, board.depth],
    meta: {
      layer: "board",
      cols: board.cols,
      rows: board.rows,
    },
  };
}

export function buildPreviewScene(
  input: PreviewInput,
  view: PreviewView = "assembled",
): PreviewScene {
  const boardSpec = createBoardSpec(input.shellSize);
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
          type: "screen",
          position: screenPlacement.worldPosition,
          rotation: screenPlacement.rotation,
          size: screenPlacement.sizeMm,
          meta: {
            layer: "screen",
            face: screenPlacement.face,
          },
        },
      ]
    : [];

  const portNodes: SceneNode[] = portPlacements.map((port) => ({
    id: port.id,
    type: "port",
    position: port.worldPosition,
    rotation: port.rotation,
    size: port.sizeMm,
    meta: {
      layer: "port",
      face: port.face,
    },
  }));

  const scene: PreviewScene = {
    view: "assembled",
    shellNode: createShellNode(input),
    boardNode: createBoardNode(input),
    moduleNodes,
    screenNodes,
    portNodes,
  };

  return applyPreviewView(scene, view);
}
