"use client";

import type { BoardPlacedModule, BoardSpec, ResolvedModuleDefinition } from "./types";
import { getBoardCellSize } from "./boardGrid";

const BOARD_COMPONENT_FOOTPRINT_RATIO = 0.84;
const BOARD_COMPONENT_HEIGHT_RATIO = 0.92;

export function gridToBoardWorldPosition(
  board: BoardSpec,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  moduleHeight: number,
): [number, number, number] {
  const { cellW, cellD } = getBoardCellSize(board);
  const localU = -board.width / 2 + cellW * (gridX + gridW / 2);
  const localV = -board.depth / 2 + cellD * (gridY + gridH / 2);
  const normalOffset = board.thickness / 2 + moduleHeight / 2;

  return [
    board.center[0] +
      board.axisU[0] * localU +
      board.axisV[0] * localV +
      board.normal[0] * normalOffset,
    board.center[1] +
      board.axisU[1] * localU +
      board.axisV[1] * localV +
      board.normal[1] * normalOffset,
    board.center[2] +
      board.axisU[2] * localU +
      board.axisV[2] * localV +
      board.normal[2] * normalOffset,
  ];
}

export function createPlacedModule(
  board: BoardSpec,
  module: ResolvedModuleDefinition,
  zone: BoardPlacedModule["zone"],
  gridX: number,
  gridY: number,
): BoardPlacedModule {
  const { cellW, cellD } = getBoardCellSize(board);
  const visualWidth = Math.min(
    module.sizeMm.width,
    Math.max(4, cellW * module.gridW * BOARD_COMPONENT_FOOTPRINT_RATIO),
  );
  const visualDepth = Math.min(
    module.sizeMm.depth,
    Math.max(4, cellD * module.gridH * BOARD_COMPONENT_FOOTPRINT_RATIO),
  );
  const visualHeight = Math.min(
    module.sizeMm.height,
    Math.max(2, board.maxComponentHeight * BOARD_COMPONENT_HEIGHT_RATIO),
  );

  return {
    id: module.id,
    type: module.id,
    zone,
    gridX,
    gridY,
    gridW: module.gridW,
    gridH: module.gridH,
    worldPosition: gridToBoardWorldPosition(
      board,
      gridX,
      gridY,
      module.gridW,
      module.gridH,
      visualHeight,
    ),
    sizeMm: [visualWidth, visualHeight, visualDepth],
  };
}
