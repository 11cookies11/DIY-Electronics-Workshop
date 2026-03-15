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
  const centerCols = [Math.floor(cols / 2) - 1, Math.floor(cols / 2)];
  const centerRows = [Math.floor(rows / 2) - 1, Math.floor(rows / 2)];

  if (zone === "any") {
    return range(0, rows).flatMap((y) => range(0, cols).map((x) => ({ x, y })));
  }

  if (zone === "center") {
    return centerRows.flatMap((y) => centerCols.map((x) => ({ x, y })));
  }

  if (zone === "top") {
    return range(0, Math.max(2, Math.ceil(rows / 3))).flatMap((y) =>
      range(0, cols).map((x) => ({ x, y })),
    );
  }

  if (zone === "bottom") {
    return range(rows - Math.max(2, Math.ceil(rows / 3)), rows).flatMap((y) =>
      range(0, cols).map((x) => ({ x, y })),
    );
  }

  if (zone === "left") {
    return range(0, rows).flatMap((y) =>
      range(0, Math.max(2, Math.ceil(cols / 3))).map((x) => ({ x, y })),
    );
  }

  if (zone === "right") {
    return range(0, rows).flatMap((y) =>
      range(cols - Math.max(2, Math.ceil(cols / 3)), cols).map((x) => ({ x, y })),
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
) {
  if (gridX < 0 || gridY < 0) {
    return false;
  }

  if (gridX + gridW > board.cols || gridY + gridH > board.rows) {
    return false;
  }

  for (let y = gridY; y < gridY + gridH; y += 1) {
    for (let x = gridX; x < gridX + gridW; x += 1) {
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
) {
  for (let y = gridY; y < gridY + gridH; y += 1) {
    for (let x = gridX; x < gridX + gridW; x += 1) {
      board.cells[y][x] = {
        occupied: true,
        moduleId,
      };
    }
  }
}

function categoryOrder(module: ModuleDefinition) {
  switch (module.category) {
    case "core":
      return 1;
    case "power":
      return 2;
    case "communication":
      return 3;
    case "sensor":
      return 4;
    case "actuator":
      return 5;
    default:
      return 6;
  }
}

function findPlacementInZone(
  board: BoardGrid,
  module: ResolvedModuleDefinition,
  zone: BoardZone,
) {
  const candidates = getZoneCells(board, zone);

  for (const candidate of candidates) {
    if (canPlace(board, candidate.x, candidate.y, module.gridW, module.gridH)) {
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

    occupy(board, module.id, candidate.x, candidate.y, module.gridW, module.gridH);
    placedModules.push(
      createPlacedModule(boardSpec, module, zone, candidate.x, candidate.y),
    );
  }

  return placedModules;
}
