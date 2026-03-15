export interface LabNode {
  id: string;
  assembledPos: [number, number, number];
  explodedPos: [number, number, number];
  label: string;
  type: "mcu" | "sensor" | "screen" | "battery" | "speaker" | "network";
  status: "active" | "idle" | "warning";
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  speed: number;
  flowType: "data" | "power" | "control";
}

export const LAB_NODES: LabNode[] = [
  { id: "mcu", assembledPos: [-0.1, 0, 0], explodedPos: [-0.6, 0.4, 0], label: "ESP32 控制器", type: "mcu", status: "active" },
  { id: "sensor", assembledPos: [0.1, 0, 0], explodedPos: [0.6, 0.4, 0], label: "MPU-6050 传感器", type: "sensor", status: "active" },
  { id: "battery", assembledPos: [0, -0.15, 0], explodedPos: [0, -1.2, 0], label: "高能电池", type: "battery", status: "active" },
  { id: "speaker", assembledPos: [0.15, 0.15, 0], explodedPos: [1.2, 1.2, 0], label: "立体声扬声器", type: "speaker", status: "active" },
  { id: "network", assembledPos: [-0.15, 0.15, 0], explodedPos: [-1.2, 1.2, 0], label: "WiFi 6 模块", type: "network", status: "active" },
  { id: "screen_front", assembledPos: [0, 0, 0.5], explodedPos: [0, 0, 2.5], label: "前置屏幕", type: "screen", status: "active" },
  { id: "screen_back", assembledPos: [0, 0, -0.5], explodedPos: [0, 0, -2.5], label: "后置屏幕", type: "screen", status: "active" },
  { id: "screen_top", assembledPos: [0, 0.5, 0], explodedPos: [0, 2.5, 0], label: "顶部屏幕", type: "screen", status: "active" },
  { id: "screen_bottom", assembledPos: [0, -0.5, 0], explodedPos: [0, -2.5, 0], label: "底部屏幕", type: "screen", status: "active" },
  { id: "screen_left", assembledPos: [-0.5, 0, 0], explodedPos: [-2.5, 0, 0], label: "左侧屏幕", type: "screen", status: "active" },
  { id: "screen_right", assembledPos: [0.5, 0, 0], explodedPos: [2.5, 0, 0], label: "右侧屏幕", type: "screen", status: "active" },
];

export const CONNECTIONS: Connection[] = [
  { id: "p1", from: "battery", to: "mcu", speed: 2, flowType: "power" },
  { id: "p2", from: "battery", to: "sensor", speed: 2, flowType: "power" },
  { id: "d1", from: "network", to: "mcu", speed: 3, flowType: "data" },
  { id: "d2", from: "sensor", to: "mcu", speed: 5, flowType: "data" },
  { id: "c1", from: "mcu", to: "speaker", speed: 1.5, flowType: "control" },
  { id: "ds1", from: "mcu", to: "screen_front", speed: 4, flowType: "data" },
  { id: "ds2", from: "mcu", to: "screen_back", speed: 4, flowType: "data" },
  { id: "ds3", from: "mcu", to: "screen_top", speed: 4, flowType: "data" },
  { id: "ds4", from: "mcu", to: "screen_bottom", speed: 4, flowType: "data" },
  { id: "ds5", from: "mcu", to: "screen_left", speed: 4, flowType: "data" },
  { id: "ds6", from: "mcu", to: "screen_right", speed: 4, flowType: "data" },
];

export const THEME = {
  bg: "#050505",
  bgLight: "#f1f2f4",
  primary: "#00ffcc",
  secondary: "#2098ff",
  power: "#ffaa00",
  warning: "#ff5b3d",
};
