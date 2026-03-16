"use client";

import type {
  BoardGrid,
  BoardPlacedModule,
  BoardSpec,
  BoardZone,
  GridCell,
  ModuleDefinition,
  PreviewInput,
  ResolvedModuleDefinition,
  ShellSize,
} from "./types";
import { createPlacedModule } from "./worldTransform";

const DEFAULT_BOARD_COLS = 6;
const DEFAULT_BOARD_ROWS = 6;
const DEFAULT_BOARD_THICKNESS = 2;
const DEFAULT_BOARD_WIDTH_RATIO = 0.78;
const DEFAULT_BOARD_DEPTH_RATIO = 0.7;

function createGridCell(): GridCell {
  return {
    occupied: false,
  };
}

export function createBoardGrid(
  cols = DEFAULT_BOARD_COLS,
  rows = DEFAULT_BOARD_ROWS,
): BoardGrid {
  return {
    cols,
    rows,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => createGridCell()),
    ),
  };
}

export function getBoardDimensions(
  shellSize: ShellSize,
  boardConfig?: PreviewInput["board"],
) {
  return {
    width:
      boardConfig?.sizeMm?.width ?? shellSize.width * DEFAULT_BOARD_WIDTH_RATIO,
    depth:
      boardConfig?.sizeMm?.depth ?? shellSize.depth * DEFAULT_BOARD_DEPTH_RATIO,
    thickness:
      boardConfig?.sizeMm?.thickness ?? DEFAULT_BOARD_THICKNESS,
  };
}

export function createBoardSpec(
  shellSize: ShellSize,
  boardConfig?: PreviewInput["board"],
): BoardSpec {
  const cols = boardConfig?.grid?.cols ?? DEFAULT_BOARD_COLS;
  const rows = boardConfig?.grid?.rows ?? DEFAULT_BOARD_ROWS;
  const dimensions = getBoardDimensions(shellSize, boardConfig);
  const center: [number, number, number] = [0, 0, 0];
  const topY = center[1] + dimensions.thickness / 2;

  return {
    center,
    width: dimensions.width,
    depth: dimensions.depth,
    thickness: dimensions.thickness,
    topY,
    cols,
    rows,
  };
}

export function getBoardCellSize(board: BoardSpec) {
  return {
    cellW: board.width / board.cols,
    cellD: board.depth / board.rows,
  };
}

function range(start: number, end: number) {
  return Array.from(
    { length: Math.max(end - start, 0) },
    (_, index) => start + index,
  );
}

export function getZoneCells(board: BoardGrid, zone: BoardZone) {
  const cols = board.cols;
  const rows = board.rows;
  const topBand = Math.max(2, Math.ceil(rows / 3));
  const sideBand = Math.max(2, Math.ceil(cols / 3));

  if (zone === "any") {
    return range(0, rows).flatMap((y) => range(0, cols).map((x) => ({ x, y })));
  }

  if (zone === "center") {
    return range(0, rows).flatMap((y) => range(0, cols).map((x) => ({ x, y })));
  }

  if (zone === "top") {
    return range(0, topBand).flatMap((y) =>
      range(0, cols).map((x) => ({ x, y })),
    );
  }

  if (zone === "bottom") {
    return range(rows - topBand, rows).flatMap((y) =>
      range(0, cols).map((x) => ({ x, y })),
    );
  }

  if (zone === "left") {
    return range(0, rows).flatMap((y) =>
      range(0, sideBand).map((x) => ({ x, y })),
    );
  }

  if (zone === "right") {
    return range(0, rows).flatMap((y) =>
      range(cols - sideBand, cols).map((x) => ({ x, y })),
    );
  }

  return [
    ...range(0, cols).map((x) => ({ x, y: 0 })),
    ...range(0, cols).map((x) => ({ x, y: rows - 1 })),
    ...range(1, rows - 1).map((y) => ({ x: 0, y })),
    ...range(1, rows - 1).map((y) => ({ x: cols - 1, y })),
  ];
}

export function canPlace(
  board: BoardGrid,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  clearanceCells = 0,
) {
  if (gridX < 0 || gridY < 0) {
    return false;
  }

  if (gridX + gridW > board.cols || gridY + gridH > board.rows) {
    return false;
  }

  const startX = Math.max(0, gridX - clearanceCells);
  const startY = Math.max(0, gridY - clearanceCells);
  const endX = Math.min(board.cols, gridX + gridW + clearanceCells);
  const endY = Math.min(board.rows, gridY + gridH + clearanceCells);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (board.cells[y]?.[x]?.occupied) {
        return false;
      }
    }
  }

  return true;
}

export function occupy(
  board: BoardGrid,
  moduleId: string,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  clearanceCells = 0,
) {
  const startX = Math.max(0, gridX - clearanceCells);
  const startY = Math.max(0, gridY - clearanceCells);
  const endX = Math.min(board.cols, gridX + gridW + clearanceCells);
  const endY = Math.min(board.rows, gridY + gridH + clearanceCells);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const isCoreCell =
        x >= gridX &&
        x < gridX + gridW &&
        y >= gridY &&
        y < gridY + gridH;

      board.cells[y][x] = {
        occupied: true,
        moduleId: isCoreCell ? moduleId : undefined,
        reservedBy: isCoreCell ? undefined : moduleId,
      };
    }
  }
}

function getModuleClearanceCells(module: ResolvedModuleDefinition) {
  if (typeof module.clearanceCells === "number") {
    return module.clearanceCells;
  }

  switch (module.category) {
    case "core":
    case "power":
    case "communication":
    case "thermal":
      return 1;
    default:
      return 0;
  }
}

function categoryOrder(module: ModuleDefinition) {
  switch (module.category) {
    case "core":
      return 1;
    case "thermal":
      return 2;
    case "power":
      return 3;
    case "storage":
      return 4;
    case "communication":
      return 5;
    case "interface":
      return 6;
    case "sensor":
      return 7;
    case "actuator":
      return 8;
    case "mechanical":
      return 9;
    default:
      return 10;
  }
}

function getAnchorMetrics(
  board: BoardGrid,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
) {
  const centerX = gridX + gridW / 2;
  const centerY = gridY + gridH / 2;
  const boardCenterX = board.cols / 2;
  const boardCenterY = board.rows / 2;
  const distanceToCenter =
    Math.abs(centerX - boardCenterX) + Math.abs(centerY - boardCenterY);
  const distanceToVerticalCenter = Math.abs(centerY - boardCenterY);
  const distanceToHorizontalCenter = Math.abs(centerX - boardCenterX);
  const topDistance = gridY;
  const bottomDistance = board.rows - (gridY + gridH);
  const leftDistance = gridX;
  const rightDistance = board.cols - (gridX + gridW);
  const nearestEdge = Math.min(topDistance, bottomDistance, leftDistance, rightDistance);

  return {
    centerX,
    centerY,
    distanceToCenter,
    distanceToVerticalCenter,
    distanceToHorizontalCenter,
    topDistance,
    bottomDistance,
    leftDistance,
    rightDistance,
    nearestEdge,
  };
}

function getZoneScore(
  board: BoardGrid,
  zone: BoardZone,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
) {
  const metrics = getAnchorMetrics(board, gridX, gridY, gridW, gridH);
  const widthBias = Math.max(0, gridW - 1) * 0.18;
  const heightBias = Math.max(0, gridH - 1) * 0.18;

  switch (zone) {
    case "center":
      return (
        metrics.distanceToCenter * 10 +
        metrics.distanceToHorizontalCenter * 2 +
        metrics.distanceToVerticalCenter * 2 +
        widthBias
      );
    case "top":
      return (
        metrics.topDistance * 12 +
        metrics.distanceToHorizontalCenter * 4 +
        metrics.distanceToVerticalCenter * 1.5 +
        widthBias
      );
    case "bottom":
      return (
        metrics.bottomDistance * 12 +
        metrics.distanceToHorizontalCenter * 4 +
        metrics.distanceToVerticalCenter * 1.5 +
        widthBias
      );
    case "left":
      return (
        metrics.leftDistance * 12 +
        metrics.distanceToVerticalCenter * 4 +
        metrics.distanceToHorizontalCenter * 1.5 +
        heightBias
      );
    case "right":
      return (
        metrics.rightDistance * 12 +
        metrics.distanceToVerticalCenter * 4 +
        metrics.distanceToHorizontalCenter * 1.5 +
        heightBias
      );
    case "edge":
      return (
        metrics.nearestEdge * 14 +
        metrics.distanceToCenter * 1.5 +
        widthBias +
        heightBias
      );
    case "any":
    default:
      return (
        metrics.distanceToCenter * 5 +
        metrics.distanceToHorizontalCenter * 1.5 +
        metrics.distanceToVerticalCenter * 1.5
      );
  }
}

function findPlacementInZone(
  board: BoardGrid,
  module: ResolvedModuleDefinition,
  zone: BoardZone,
) {
  const clearanceCells = getModuleClearanceCells(module);
  const candidates = getZoneCells(board, zone)
    .filter((candidate, index, collection) => {
      return collection.findIndex((entry) => entry.x === candidate.x && entry.y === candidate.y) === index;
    })
    .sort((left, right) => {
      const leftScore = getZoneScore(board, zone, left.x, left.y, module.gridW, module.gridH);
      const rightScore = getZoneScore(board, zone, right.x, right.y, module.gridW, module.gridH);
      return leftScore - rightScore || left.y - right.y || left.x - right.x;
    });

  for (const candidate of candidates) {
    if (
      canPlace(
        board,
        candidate.x,
        candidate.y,
        module.gridW,
        module.gridH,
        clearanceCells,
      )
    ) {
      return candidate;
    }
  }

  return null;
}

export function placeModules(
  board: BoardGrid,
  boardSpec: BoardSpec,
  modules: ResolvedModuleDefinition[],
): BoardPlacedModule[] {
  const placedModules: BoardPlacedModule[] = [];
  const sorted = [...modules].sort((a, b) => {
    return categoryOrder(a) - categoryOrder(b) || a.id.localeCompare(b.id);
  });

  for (const module of sorted) {
    let zone: BoardZone = module.preferredZone;
    let candidate = findPlacementInZone(board, module, zone);

    if (!candidate && zone !== "any") {
      zone = "any";
      candidate = findPlacementInZone(board, module, zone);
    }

    if (!candidate) {
      throw new Error(`cannot place module: ${module.id}`);
    }

    occupy(
      board,
      module.id,
      candidate.x,
      candidate.y,
      module.gridW,
      module.gridH,
      getModuleClearanceCells(module),
    );
    placedModules.push(
      createPlacedModule(boardSpec, module, zone, candidate.x, candidate.y),
    );
  }

  return placedModules;
}
