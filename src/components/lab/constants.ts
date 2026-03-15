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

export type ProductTemplateId =
  | "immersive-cube"
  | "handheld-terminal"
  | "industrial-console"
  | "sensor-station";

type NodePose = {
  assembledPos?: [number, number, number];
  explodedPos?: [number, number, number];
};

export const LAB_NODES: LabNode[] = [
  {
    id: "mcu",
    assembledPos: [-0.1, 0, 0],
    explodedPos: [-0.6, 0.4, 0],
    label: "ESP32 控制器",
    type: "mcu",
    status: "active",
  },
  {
    id: "sensor",
    assembledPos: [0.1, 0, 0],
    explodedPos: [0.6, 0.4, 0],
    label: "MPU-6050 传感器",
    type: "sensor",
    status: "active",
  },
  {
    id: "battery",
    assembledPos: [0, -0.15, 0],
    explodedPos: [0, -1.2, 0],
    label: "高能电池",
    type: "battery",
    status: "active",
  },
  {
    id: "speaker",
    assembledPos: [0.15, 0.15, 0],
    explodedPos: [1.2, 1.2, 0],
    label: "立体扬声器",
    type: "speaker",
    status: "active",
  },
  {
    id: "network",
    assembledPos: [-0.15, 0.15, 0],
    explodedPos: [-1.2, 1.2, 0],
    label: "WiFi 6 模块",
    type: "network",
    status: "active",
  },
  {
    id: "screen_front",
    assembledPos: [0, 0, 0.5],
    explodedPos: [0, 0, 2.5],
    label: "前置屏幕",
    type: "screen",
    status: "active",
  },
  {
    id: "screen_back",
    assembledPos: [0, 0, -0.5],
    explodedPos: [0, 0, -2.5],
    label: "后置屏幕",
    type: "screen",
    status: "active",
  },
  {
    id: "screen_top",
    assembledPos: [0, 0.5, 0],
    explodedPos: [0, 2.5, 0],
    label: "顶部屏幕",
    type: "screen",
    status: "active",
  },
  {
    id: "screen_bottom",
    assembledPos: [0, -0.5, 0],
    explodedPos: [0, -2.5, 0],
    label: "底部屏幕",
    type: "screen",
    status: "active",
  },
  {
    id: "screen_left",
    assembledPos: [-0.5, 0, 0],
    explodedPos: [-2.5, 0, 0],
    label: "左侧屏幕",
    type: "screen",
    status: "active",
  },
  {
    id: "screen_right",
    assembledPos: [0.5, 0, 0],
    explodedPos: [2.5, 0, 0],
    label: "右侧屏幕",
    type: "screen",
    status: "active",
  },
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

export const PRODUCT_TEMPLATES: Array<{
  id: ProductTemplateId;
  label: string;
  description: string;
  visibleNodeIds: string[];
  nodePoses: Record<string, NodePose>;
}> = [
  {
    id: "immersive-cube",
    label: "沉浸立方体",
    description: "六面屏立方体装配形态，适合展示完整内部结构。",
    visibleNodeIds: LAB_NODES.map((node) => node.id),
    nodePoses: {},
  },
  {
    id: "handheld-terminal",
    label: "手持终端",
    description: "保留前后主屏、电池和核心模组，更像便携式智能设备。",
    visibleNodeIds: [
      "mcu",
      "sensor",
      "battery",
      "speaker",
      "network",
      "screen_front",
      "screen_back",
    ],
    nodePoses: {
      mcu: { assembledPos: [0, -0.08, -0.08], explodedPos: [0, 0.05, -0.3] },
      sensor: { assembledPos: [0, 0.28, 0.02], explodedPos: [0.78, 0.62, 0.15] },
      battery: { assembledPos: [0, -0.58, 0], explodedPos: [0, -1.45, 0.12] },
      speaker: { assembledPos: [0.24, -0.32, 0.04], explodedPos: [1.12, -0.42, 0.08] },
      network: { assembledPos: [0, 0.52, -0.08], explodedPos: [-0.92, 1.08, -0.18] },
      screen_front: { assembledPos: [0, 0, 0.42], explodedPos: [0, 0, 2.05] },
      screen_back: { assembledPos: [0, 0, -0.32], explodedPos: [0, 0, -1.65] },
    },
  },
  {
    id: "industrial-console",
    label: "工业控制盒",
    description: "保留前屏和内部核心组件，更接近盒体式工业控制设备。",
    visibleNodeIds: [
      "mcu",
      "sensor",
      "battery",
      "speaker",
      "network",
      "screen_front",
    ],
    nodePoses: {
      mcu: { assembledPos: [0, -0.12, -0.08], explodedPos: [-0.18, 0.18, -0.22] },
      sensor: { assembledPos: [0.28, 0.05, 0], explodedPos: [0.95, 0.62, 0.08] },
      battery: { assembledPos: [-0.34, -0.46, 0], explodedPos: [-1.12, -1.02, 0.12] },
      speaker: { assembledPos: [0.34, -0.34, 0], explodedPos: [1.18, -0.22, 0.06] },
      network: { assembledPos: [-0.3, 0.26, -0.12], explodedPos: [-1.2, 1.05, -0.18] },
      screen_front: { assembledPos: [0, 0.08, 0.52], explodedPos: [0, 0.08, 2.18] },
    },
  },
  {
    id: "sensor-station",
    label: "传感节点",
    description: "突出传感器、网络、电池和前屏，更像边缘采集站。",
    visibleNodeIds: [
      "mcu",
      "sensor",
      "battery",
      "network",
      "screen_front",
    ],
    nodePoses: {
      mcu: { assembledPos: [0, -0.02, 0], explodedPos: [0, 0.18, 0] },
      sensor: { assembledPos: [0, 0.46, 0.04], explodedPos: [1.02, 1.08, 0.12] },
      battery: { assembledPos: [0, -0.62, 0], explodedPos: [0, -1.62, 0.12] },
      network: { assembledPos: [-0.42, 0.18, -0.08], explodedPos: [-1.42, 1.12, -0.22] },
      screen_front: { assembledPos: [0, 0.12, 0.5], explodedPos: [0, 0.18, 2.18] },
    },
  },
];

export function getNodePose(
  node: LabNode,
  templateId: ProductTemplateId,
): Required<NodePose> {
  const template = PRODUCT_TEMPLATES.find((entry) => entry.id === templateId);
  const override = template?.nodePoses[node.id];

  return {
    assembledPos: override?.assembledPos ?? node.assembledPos,
    explodedPos: override?.explodedPos ?? node.explodedPos,
  };
}

export function isNodeVisible(templateId: ProductTemplateId, nodeId: string) {
  const template = PRODUCT_TEMPLATES.find((entry) => entry.id === templateId);
  return template?.visibleNodeIds.includes(nodeId) ?? true;
}

export const THEME = {
  bg: "#050505",
  bgLight: "#f1f2f4",
  primary: "#00ffcc",
  secondary: "#2098ff",
  power: "#ffaa00",
  warning: "#ff5b3d",
};
