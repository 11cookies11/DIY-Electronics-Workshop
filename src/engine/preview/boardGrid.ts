"use client";

import type {
  BoardGrid,
  BoardPlacedModule,
  BoardSpec,
  BoardZone,
  FaceName,
  ModuleDefinition,
  GridCell,
  PreviewInput,
  ResolvedModuleDefinition,
  ShellSize,
} from "./types";
import { getFaceDescriptor } from "./shellGeometry";
import { createPlacedModule } from "./worldTransform";

const DEFAULT_BOARD_COLS = 6;
const DEFAULT_BOARD_ROWS = 6;
const DEFAULT_BOARD_THICKNESS = 2;
const DEFAULT_BOARD_WIDTH_RATIO = 0.78;
const DEFAULT_BOARD_DEPTH_RATIO = 0.7;
const BOARD_MODULE_MIN_MARGIN_MM = 6;
const BOARD_SCREEN_WIDTH_RATIO = 0.86;
const BOARD_SCREEN_DEPTH_RATIO = 0.82;
const BOARD_SCREEN_MARGIN_MM = 4;
const BOARD_SHELL_INSET_MM = 3;
const BOARD_PACKING_FILL_RATIO = 0.74;

type BoardLayoutHints = {
  screenShadow?: {
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  };
};

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

function inferBoardMountFace(
  shellSize: ShellSize,
  mainScreen?: PreviewInput["mainScreen"],
): FaceName {
  if (
    mainScreen &&
    (mainScreen.face === "front" || mainScreen.face === "back") &&
    shellSize.depth <= Math.min(shellSize.width, shellSize.height) * 0.6 &&
    shellSize.height >= shellSize.depth * 2
  ) {
    return mainScreen.face;
  }

  return "top";
}

function getBoardMountRotation(face: FaceName): [number, number, number] {
  switch (face) {
    case "top":
      return [0, 0, 0];
    case "bottom":
      return [Math.PI, 0, 0];
    case "front":
      return [Math.PI / 2, 0, 0];
    case "back":
      return [-Math.PI / 2, 0, 0];
    case "right":
      return [0, 0, -Math.PI / 2];
    case "left":
      return [0, 0, Math.PI / 2];
    default:
      return [0, 0, 0];
  }
}

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
  modules: ResolvedModuleDefinition[] = [],
  mainScreen?: PreviewInput["mainScreen"],
) {
  const mountFace = inferBoardMountFace(shellSize, mainScreen);
  const cols = boardConfig?.grid?.cols ?? DEFAULT_BOARD_COLS;
  const rows = boardConfig?.grid?.rows ?? DEFAULT_BOARD_ROWS;
  const planeSize =
    mountFace === "front" || mountFace === "back"
      ? { width: shellSize.width, depth: shellSize.height }
      : mountFace === "left" || mountFace === "right"
        ? { width: shellSize.depth, depth: shellSize.height }
        : { width: shellSize.width, depth: shellSize.depth };
  const maxModuleWidth = modules.reduce(
    (currentMax, module) => Math.max(currentMax, module.sizeMm.width),
    0,
  );
  const maxModuleDepth = modules.reduce(
    (currentMax, module) => Math.max(currentMax, module.sizeMm.depth),
    0,
  );
  const totalModuleArea = modules.reduce(
    (total, module) => total + module.sizeMm.width * module.sizeMm.depth,
    0,
  );
  const baseAspectRatio =
    (boardConfig?.sizeMm?.width ?? planeSize.width) /
    Math.max(1, boardConfig?.sizeMm?.depth ?? planeSize.depth);
  const packedWidth =
    totalModuleArea > 0
      ? Math.sqrt((totalModuleArea * baseAspectRatio) / BOARD_PACKING_FILL_RATIO)
      : 0;
  const packedDepth =
    totalModuleArea > 0
      ? Math.sqrt((totalModuleArea / baseAspectRatio) / BOARD_PACKING_FILL_RATIO)
      : 0;
  const widthFloor = Math.max(
    maxModuleWidth + BOARD_MODULE_MIN_MARGIN_MM,
    packedWidth + BOARD_MODULE_MIN_MARGIN_MM,
  );
  const depthFloor = Math.max(
    maxModuleDepth + BOARD_MODULE_MIN_MARGIN_MM,
    packedDepth + BOARD_MODULE_MIN_MARGIN_MM,
  );
  const screenWidth = mainScreen?.sizeMm?.width ?? (
    mainScreen?.type === "touch_display" ? 62 : 54
  );
  const screenHeight = mainScreen?.sizeMm?.height ?? (
    mainScreen?.type === "touch_display" ? 38 : 34
  );
  const boardFromScreen =
    mainScreen && (mainScreen.face === "front" || mainScreen.face === "back")
      ? {
          width:
            screenWidth * BOARD_SCREEN_WIDTH_RATIO + BOARD_SCREEN_MARGIN_MM,
          depth:
            screenHeight * BOARD_SCREEN_DEPTH_RATIO + BOARD_SCREEN_MARGIN_MM,
        }
      : {
          width: 0,
          depth: 0,
        };
  const maxBoardWidth = Math.max(12, planeSize.width - BOARD_SHELL_INSET_MM * 2);
  const maxBoardDepth = Math.max(12, planeSize.depth - BOARD_SHELL_INSET_MM * 2);

  return {
    width: Math.min(
      maxBoardWidth,
      Math.max(
        boardConfig?.sizeMm?.width ?? shellSize.width * DEFAULT_BOARD_WIDTH_RATIO,
        widthFloor,
        boardFromScreen.width,
      ),
    ),
    depth: Math.min(
      maxBoardDepth,
      Math.max(
        boardConfig?.sizeMm?.depth ?? shellSize.depth * DEFAULT_BOARD_DEPTH_RATIO,
        depthFloor,
        boardFromScreen.depth,
      ),
    ),
    thickness:
      boardConfig?.sizeMm?.thickness ?? DEFAULT_BOARD_THICKNESS,
  };
}

export function createBoardSpec(
  shellSize: ShellSize,
  boardConfig?: PreviewInput["board"],
  modules: ResolvedModuleDefinition[] = [],
  mainScreen?: PreviewInput["mainScreen"],
): BoardSpec {
  const cols = boardConfig?.grid?.cols ?? DEFAULT_BOARD_COLS;
  const rows = boardConfig?.grid?.rows ?? DEFAULT_BOARD_ROWS;
  const dimensions = getBoardDimensions(
    shellSize,
    boardConfig,
    modules,
    mainScreen,
  );
  const mountFace = inferBoardMountFace(shellSize, mainScreen);
  const descriptor = getFaceDescriptor("cuboid", shellSize, mountFace);
  const componentFace = getOppositeFace(mountFace);
  const componentDescriptor = getFaceDescriptor("cuboid", shellSize, componentFace);
  const screenInset =
    mainScreen &&
    mainScreen.face === mountFace
      ? (mainScreen.sizeMm?.depth ??
          (mainScreen.type === "touch_display" ? 5 : 4)) + 2
      : 0;
  const normalInset = dimensions.thickness / 2 + BOARD_SHELL_INSET_MM + screenInset;
  const center: [number, number, number] = [
    descriptor.center[0] - descriptor.normal[0] * normalInset,
    descriptor.center[1] - descriptor.normal[1] * normalInset,
    descriptor.center[2] - descriptor.normal[2] * normalInset,
  ];
  const topY = center[1] + dimensions.thickness / 2;

  return {
    center,
    width: dimensions.width,
    depth: dimensions.depth,
    thickness: dimensions.thickness,
    topY,
    mountFace,
    rotation: getBoardMountRotation(mountFace),
    normal: componentDescriptor.normal,
    axisU: descriptor.axisU,
    axisV: descriptor.axisV,
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
  keepoutCells: ModuleDefinition["keepoutCells"] = {},
) {
  if (gridX < 0 || gridY < 0) {
    return false;
  }

  if (gridX + gridW > board.cols || gridY + gridH > board.rows) {
    return false;
  }

  const startX = Math.max(
    0,
    gridX - clearanceCells - (keepoutCells.left ?? 0),
  );
  const startY = Math.max(
    0,
    gridY - clearanceCells - (keepoutCells.top ?? 0),
  );
  const endX = Math.min(
    board.cols,
    gridX + gridW + clearanceCells + (keepoutCells.right ?? 0),
  );
  const endY = Math.min(
    board.rows,
    gridY + gridH + clearanceCells + (keepoutCells.bottom ?? 0),
  );

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
  keepoutCells: ModuleDefinition["keepoutCells"] = {},
) {
  const startX = Math.max(
    0,
    gridX - clearanceCells - (keepoutCells.left ?? 0),
  );
  const startY = Math.max(
    0,
    gridY - clearanceCells - (keepoutCells.top ?? 0),
  );
  const endX = Math.min(
    board.cols,
    gridX + gridW + clearanceCells + (keepoutCells.right ?? 0),
  );
  const endY = Math.min(
    board.rows,
    gridY + gridH + clearanceCells + (keepoutCells.bottom ?? 0),
  );

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

function getModuleKeepoutCells(module: ResolvedModuleDefinition) {
  return module.keepoutCells ?? {};
}

function getPlacementConfig(
  module: ResolvedModuleDefinition,
  relaxationLevel: number,
) {
  const clearanceCells = getModuleClearanceCells(module);
  const keepoutCells = getModuleKeepoutCells(module);

  const attempts: Array<{
    clearanceCells: number;
    keepoutCells: ModuleDefinition["keepoutCells"];
  }> = [
    { clearanceCells, keepoutCells },
    { clearanceCells, keepoutCells: {} },
  ];

  if (clearanceCells > 0) {
    attempts.push({
      clearanceCells: Math.max(0, clearanceCells - 1),
      keepoutCells: {},
    });
    attempts.push({
      clearanceCells: 0,
      keepoutCells: {},
    });
  }

  const dedupedAttempts = attempts.filter((attempt, index, collection) => {
    return (
      collection.findIndex((entry) => {
        return (
          entry.clearanceCells === attempt.clearanceCells &&
          (entry.keepoutCells?.top ?? 0) === (attempt.keepoutCells?.top ?? 0) &&
          (entry.keepoutCells?.bottom ?? 0) === (attempt.keepoutCells?.bottom ?? 0) &&
          (entry.keepoutCells?.left ?? 0) === (attempt.keepoutCells?.left ?? 0) &&
          (entry.keepoutCells?.right ?? 0) === (attempt.keepoutCells?.right ?? 0)
        );
      }) === index
    );
  });

  return dedupedAttempts[Math.min(relaxationLevel, dedupedAttempts.length - 1)] ?? {
    clearanceCells: 0,
    keepoutCells: {},
  };
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

function getPlacementPriority(module: ModuleDefinition) {
  return categoryOrder(module) * 100 + (module.placementPriority ?? 0);
}

function getModuleArea(module: ModuleDefinition) {
  return module.gridW * module.gridH;
}

function getScreenShadowHints(
  boardSpec: BoardSpec,
  mainScreen?: PreviewInput["mainScreen"],
): BoardLayoutHints {
  if (!mainScreen || (mainScreen.face !== "front" && mainScreen.face !== "back")) {
    return {};
  }

  const screenWidth = mainScreen.sizeMm?.width ?? (
    mainScreen.type === "touch_display" ? 62 : 54
  );
  const screenHeight = mainScreen.sizeMm?.height ?? (
    mainScreen.type === "touch_display" ? 38 : 34
  );
  const gridW = Math.min(
    boardSpec.cols,
    Math.max(2, Math.round(((screenWidth * 0.66) / boardSpec.width) * boardSpec.cols)),
  );
  const gridH = Math.min(
    boardSpec.rows,
    Math.max(2, Math.round(((screenHeight * 0.62) / boardSpec.depth) * boardSpec.rows)),
  );

  return {
    screenShadow: {
      gridX: Math.max(0, Math.floor((boardSpec.cols - gridW) / 2)),
      gridY: Math.max(0, Math.floor((boardSpec.rows - gridH) / 2)),
      gridW,
      gridH,
    },
  };
}

function overlapsRect(
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  rect: NonNullable<BoardLayoutHints["screenShadow"]>,
) {
  return !(
    gridX + gridW <= rect.gridX ||
    rect.gridX + rect.gridW <= gridX ||
    gridY + gridH <= rect.gridY ||
    rect.gridY + rect.gridH <= gridY
  );
}

function shouldAvoidScreenShadow(module: ResolvedModuleDefinition) {
  const sourceId = module.sourceId ?? module.id;

  return (
    module.sizeMm.height >= 9 ||
    sourceId === "battery" ||
    sourceId === "camera_module" ||
    sourceId === "cooling_fan" ||
    sourceId === "relay_module" ||
    sourceId === "rj45_port"
  );
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
  module?: ResolvedModuleDefinition,
  hints?: BoardLayoutHints,
) {
  const metrics = getAnchorMetrics(board, gridX, gridY, gridW, gridH);
  const widthBias = Math.max(0, gridW - 1) * 0.18;
  const heightBias = Math.max(0, gridH - 1) * 0.18;
  const screenShadowPenalty =
    module &&
    hints?.screenShadow &&
    shouldAvoidScreenShadow(module) &&
    overlapsRect(gridX, gridY, gridW, gridH, hints.screenShadow)
      ? 220
      : 0;

  switch (zone) {
    case "center":
      return (
        metrics.distanceToCenter * 10 +
        metrics.distanceToHorizontalCenter * 2 +
        metrics.distanceToVerticalCenter * 2 +
        widthBias +
        screenShadowPenalty
      );
    case "top":
      return (
        metrics.topDistance * 12 +
        metrics.distanceToHorizontalCenter * 4 +
        metrics.distanceToVerticalCenter * 1.5 +
        widthBias +
        screenShadowPenalty
      );
    case "bottom":
      return (
        metrics.bottomDistance * 12 +
        metrics.distanceToHorizontalCenter * 4 +
        metrics.distanceToVerticalCenter * 1.5 +
        widthBias +
        screenShadowPenalty
      );
    case "left":
      return (
        metrics.leftDistance * 12 +
        metrics.distanceToVerticalCenter * 4 +
        metrics.distanceToHorizontalCenter * 1.5 +
        heightBias +
        screenShadowPenalty
      );
    case "right":
      return (
        metrics.rightDistance * 12 +
        metrics.distanceToVerticalCenter * 4 +
        metrics.distanceToHorizontalCenter * 1.5 +
        heightBias +
        screenShadowPenalty
      );
    case "edge":
      return (
        metrics.nearestEdge * 14 +
        metrics.distanceToCenter * 1.5 +
        widthBias +
        heightBias +
        screenShadowPenalty
      );
    case "any":
    default:
      return (
        metrics.distanceToCenter * 5 +
        metrics.distanceToHorizontalCenter * 1.5 +
        metrics.distanceToVerticalCenter * 1.5 +
        screenShadowPenalty
      );
  }
}

function findPlacementInZone(
  board: BoardGrid,
  module: ResolvedModuleDefinition,
  zone: BoardZone,
  relaxationLevel: number,
  hints?: BoardLayoutHints,
) {
  const placementConfig = getPlacementConfig(module, relaxationLevel);
  const candidates = getZoneCells(board, zone)
    .filter((candidate, index, collection) => {
      return collection.findIndex((entry) => entry.x === candidate.x && entry.y === candidate.y) === index;
    })
    .sort((left, right) => {
      const leftScore = getZoneScore(
        board,
        zone,
        left.x,
        left.y,
        module.gridW,
        module.gridH,
        module,
        hints,
      );
      const rightScore = getZoneScore(
        board,
        zone,
        right.x,
        right.y,
        module.gridW,
        module.gridH,
        module,
        hints,
      );
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
        placementConfig.clearanceCells,
        placementConfig.keepoutCells,
      )
    ) {
      return {
        candidate,
        clearanceCells: placementConfig.clearanceCells,
        keepoutCells: placementConfig.keepoutCells,
      };
    }
  }

  return null;
}

function tryPlaceModules(
  board: BoardGrid,
  boardSpec: BoardSpec,
  modules: ResolvedModuleDefinition[],
  relaxationLevel: number,
  hints?: BoardLayoutHints,
) {
  const workingBoard = createBoardGrid(board.cols, board.rows);
  const placedModules: BoardPlacedModule[] = [];
  const sorted = [...modules].sort((a, b) => {
    return (
      getPlacementPriority(a) - getPlacementPriority(b) ||
      getModuleArea(b) - getModuleArea(a) ||
      categoryOrder(a) - categoryOrder(b) ||
      a.id.localeCompare(b.id)
    );
  });

  for (const module of sorted) {
    let zone: BoardZone = module.preferredZone;
    let placement = findPlacementInZone(
      workingBoard,
      module,
      zone,
      relaxationLevel,
      hints,
    );

    if (!placement && zone !== "any") {
      zone = "any";
      placement = findPlacementInZone(
        workingBoard,
        module,
        zone,
        relaxationLevel,
        hints,
      );
    }

    if (!placement) {
      return null;
    }

    occupy(
      workingBoard,
      module.id,
      placement.candidate.x,
      placement.candidate.y,
      module.gridW,
      module.gridH,
      placement.clearanceCells,
      placement.keepoutCells,
    );
    placedModules.push(
      createPlacedModule(
        boardSpec,
        module,
        zone,
        placement.candidate.x,
        placement.candidate.y,
      ),
    );
  }

  board.cells = workingBoard.cells;
  return placedModules;
}

export function placeModules(
  board: BoardGrid,
  boardSpec: BoardSpec,
  modules: ResolvedModuleDefinition[],
  hints?: BoardLayoutHints,
): BoardPlacedModule[] {
  for (const relaxationLevel of [0, 1, 2, 3]) {
    const placedModules = tryPlaceModules(
      board,
      boardSpec,
      modules,
      relaxationLevel,
      hints,
    );

    if (placedModules) {
      return placedModules;
    }
  }

  const moduleIds = modules.map((module) => module.id).join(", ");
  throw new Error(`cannot place modules on board: ${moduleIds}`);
}

export function createBoardLayoutHints(
  boardSpec: BoardSpec,
  mainScreen?: PreviewInput["mainScreen"],
) {
  return getScreenShadowHints(boardSpec, mainScreen);
}
