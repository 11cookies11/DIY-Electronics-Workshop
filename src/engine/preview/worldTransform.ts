"use client";

import type { BoardPlacedModule, BoardSpec, ResolvedModuleDefinition } from "./types";
import { getBoardCellSize } from "./boardGrid";

export function gridToBoardWorldPosition(
  board: BoardSpec,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  moduleHeight: number,
): [number, number, number] {
  const { cellW, cellD } = getBoardCellSize(board);
  const centerX = -board.width / 2 + cellW * (gridX + gridW / 2);
  const centerZ = -board.depth / 2 + cellD * (gridY + gridH / 2);
  const centerY = board.topY + moduleHeight / 2;

  return [centerX, centerY, centerZ];
}

export function createPlacedModule(
  board: BoardSpec,
  module: ResolvedModuleDefinition,
  zone: BoardPlacedModule["zone"],
  gridX: number,
  gridY: number,
): BoardPlacedModule {
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
      module.sizeMm.height,
    ),
    sizeMm: [module.sizeMm.width, module.sizeMm.height, module.sizeMm.depth],
  };
}
