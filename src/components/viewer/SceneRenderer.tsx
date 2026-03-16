"use client";

import { Billboard, Box, Cylinder, RoundedBox, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Group, Vector3 } from "three";
import type { PreviewScene, SceneNode } from "@/engine/preview";
import { BoardMesh } from "./BoardMesh";
import { ConnectionMesh } from "./ConnectionMesh";
import { ModuleMesh } from "./ModuleMesh";
import { PortMesh } from "./PortMesh";
import { ScreenMesh } from "./ScreenMesh";

function lerpNumber(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha;
}

function lerpTuple(
  from: [number, number, number],
  to: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    lerpNumber(from[0], to[0], alpha),
    lerpNumber(from[1], to[1], alpha),
    lerpNumber(from[2], to[2], alpha),
  ];
}

function interpolateNode(
  current: PreviewScene["shellNode"] | undefined,
  target: PreviewScene["shellNode"],
  alpha: number,
) {
  return {
    ...target,
    position: lerpTuple(current?.position ?? target.position, target.position, alpha),
    rotation: lerpTuple(
      (current?.rotation as [number, number, number] | undefined) ?? [0, 0, 0],
      (target.rotation as [number, number, number] | undefined) ?? [0, 0, 0],
      alpha,
    ),
    size: lerpTuple(current?.size ?? target.size, target.size, alpha),
  };
}

function interpolateNodeList(
  currentNodes: PreviewScene["moduleNodes"],
  targetNodes: PreviewScene["moduleNodes"],
  fallbackPosition: [number, number, number],
  alpha: number,
) {
  return targetNodes.map((targetNode) => {
    const currentNode = currentNodes.find((node) => node.id === targetNode.id);

    return {
      ...targetNode,
      position: lerpTuple(
        currentNode?.position ?? fallbackPosition,
        targetNode.position,
        alpha,
      ),
      rotation: lerpTuple(
        (currentNode?.rotation as [number, number, number] | undefined) ?? [0, 0, 0],
        (targetNode.rotation as [number, number, number] | undefined) ?? [0, 0, 0],
        alpha,
      ),
      size: lerpTuple(currentNode?.size ?? targetNode.size, targetNode.size, alpha),
    };
  });
}

function isSceneSettled(currentScene: PreviewScene, targetScene: PreviewScene) {
  const collectNodes = (previewScene: PreviewScene) => [
    previewScene.boardNode,
    ...previewScene.moduleNodes,
    ...previewScene.screenNodes,
    ...previewScene.portNodes,
  ];

  const currentNodes = collectNodes(currentScene);
  const targetNodes = collectNodes(targetScene);

  if (currentNodes.length !== targetNodes.length) {
    return false;
  }

  return currentNodes.every((node, index) => {
    const targetNode = targetNodes[index];

    return (
      Math.abs(node.position[0] - targetNode.position[0]) < 0.18 &&
      Math.abs(node.position[1] - targetNode.position[1]) < 0.18 &&
      Math.abs(node.position[2] - targetNode.position[2]) < 0.18 &&
      Math.abs(node.size[0] - targetNode.size[0]) < 0.12 &&
      Math.abs(node.size[1] - targetNode.size[1]) < 0.12 &&
      Math.abs(node.size[2] - targetNode.size[2]) < 0.12
    );
  });
}

function advanceSceneTowards(currentScene: PreviewScene, targetScene: PreviewScene) {
  return {
    view: targetScene.view,
    shellNode: interpolateNode(currentScene.shellNode, targetScene.shellNode, 0.14),
    boardNode: interpolateNode(currentScene.boardNode, targetScene.boardNode, 0.16),
    moduleNodes: interpolateNodeList(
      currentScene.moduleNodes,
      targetScene.moduleNodes,
      currentScene.boardNode.position,
      0.18,
    ),
    screenNodes: interpolateNodeList(
      currentScene.screenNodes,
      targetScene.screenNodes,
      currentScene.boardNode.position,
      0.18,
    ),
    portNodes: interpolateNodeList(
      currentScene.portNodes,
      targetScene.portNodes,
      currentScene.boardNode.position,
      0.18,
    ),
    connections: targetScene.connections,
  } satisfies PreviewScene;
}

function formatNodeLabel(node: SceneNode) {
  const sourceId =
    String(node.meta?.sourceId ?? node.meta?.componentType ?? node.type ?? "")
      .trim()
      .toLowerCase();

  const labelMap: Record<string, string> = {
    "main-board": "主板",
    esp32: "ESP32 开发板",
    esp32_s3: "ESP32-S3 开发板",
    stm32: "STM32 控制板",
    raspberry_pi_cm5: "树莓派 CM5",
    battery: "电池模组",
    dc_input: "DC 电源输入",
    usb_c_power: "USB-C 供电口",
    buck_converter: "降压模块",
    pmic: "电源管理芯片",
    camera_module: "摄像头模组",
    wifi: "WiFi 模块",
    bluetooth: "蓝牙模块",
    lte_4g: "4G 通信模块",
    gps: "GPS 模块",
    ethernet: "以太网模块",
    rs485: "RS485 模块",
    can: "CAN 模块",
    microphone_array: "麦克风阵列",
    temp_sensor: "温度传感器",
    humidity_sensor: "湿度传感器",
    pressure_sensor: "压力传感器",
    light_sensor: "光照传感器",
    hall_sensor: "霍尔传感器",
    imu_sensor: "IMU 传感器",
    distance_sensor: "距离传感器",
    gas_sensor: "气体传感器",
    current_sensor: "电流传感器",
    relay_module: "继电器模块",
    motor_driver: "电机驱动模块",
    servo_driver: "舵机驱动模块",
    solenoid_driver: "电磁驱动模块",
    led_driver: "LED 驱动模块",
    infrared_blaster: "红外发射模块",
    buzzer: "蜂鸣器",
    sd_card_slot: "SD 卡槽",
    nor_flash: "NOR Flash",
    nand_flash: "NAND Flash",
    eeprom: "EEPROM",
    emmc_chip: "eMMC 芯片",
    sram_chip: "SRAM 芯片",
    nvme_ssd: "NVMe SSD",
    heatsink: "散热片",
    cooling_fan: "散热风扇",
    display_panel: "显示屏",
    touch_display: "触控屏",
    usb_c: "USB-C 接口",
    rj45: "RJ45 网口",
    audio_jack: "音频接口",
    power_jack: "电源接口",
    button_cutout: "按键开孔",
    ir_window: "红外窗口",
  };

  if (labelMap[sourceId]) {
    return labelMap[sourceId];
  }

  return String(node.type)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type LabelLayout = {
  anchor: [number, number, number];
  offsetX: number;
  offsetY: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNodeLabelLayout(node: SceneNode): LabelLayout {
  const [x, y, z] = node.position;
  const [width, height] = node.size;
  const gap = clampNumber(Math.max(width, height) * 0.44, 20, 38);
  const offsetX = width * 0.5 + gap;
  const offsetY = clampNumber(height * 0.18, 1.5, 8);
  return {
    anchor: [x + offsetX, y + offsetY, z],
    offsetX,
    offsetY,
  };
}

function estimateLabelUnits(label: string) {
  return Array.from(label).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 0.35;
    }

    if (/[\u4e00-\u9fff]/.test(char)) {
      return total + 1;
    }

    return total + 0.62;
  }, 0);
}

function NodeLabel({ node }: { node: SceneNode }) {
  const { camera } = useThree();
  const layout = getNodeLabelLayout(node);
  const groupRef = useRef<Group | null>(null);
  const rightVectorRef = useRef(new Vector3(1, 0, 0));
  const forwardVectorRef = useRef(new Vector3());
  const upVectorRef = useRef(new Vector3());
  const label = formatNodeLabel(node);
  const labelUnits = estimateLabelUnits(label);
  const fontSize = clampNumber(6.2 - Math.max(0, labelUnits - 6) * 0.12, 4.8, 6.2);
  const plateWidth = clampNumber(labelUnits * 2.85 + 8.5, 17, 36);
  const plateHeight = clampNumber(fontSize * 2.2 + 10.5, 20, 26);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    camera.getWorldDirection(forwardVectorRef.current);
    upVectorRef.current.copy(camera.up).normalize();
    rightVectorRef.current
      .copy(forwardVectorRef.current)
      .cross(upVectorRef.current)
      .normalize();

    groupRef.current.position.set(
      node.position[0] + rightVectorRef.current.x * layout.offsetX,
      node.position[1] + rightVectorRef.current.y * layout.offsetX + layout.offsetY,
      node.position[2] + rightVectorRef.current.z * layout.offsetX,
    );
  });

  return (
    <group ref={groupRef} position={layout.anchor}>
      <Billboard follow>
        <group userData={{ labelHelper: true }}>
          <RoundedBox args={[plateWidth, plateHeight, 1.4]} radius={2.8} smoothness={4}>
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.04}
              roughness={0.2}
              metalness={0.02}
              transparent
              opacity={0.98}
            />
          </RoundedBox>
          <RoundedBox
            args={[plateWidth + 0.8, plateHeight + 0.8, 0.22]}
            radius={3}
            smoothness={4}
            position={[0, 0, -0.52]}
          >
            <meshBasicMaterial color="#d4d4d8" transparent opacity={0.95} />
          </RoundedBox>
          <Text
            position={[0, 0, 0.86]}
            maxWidth={plateWidth * 0.74}
            fontSize={fontSize}
            lineHeight={1.05}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            color="#111111"
            outlineWidth={0.03}
            outlineColor="#f5f5f5"
          >
            {label}
          </Text>
        </group>
      </Billboard>
    </group>
  );
}

function LabelWarmup() {
  return (
    <group position={[0, -10000, 0]} visible={false}>
      <Billboard follow>
        <group>
          <RoundedBox args={[18, 22, 1.4]} radius={2.8} smoothness={4}>
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.04}
              roughness={0.2}
              metalness={0.02}
              transparent
              opacity={0.98}
            />
          </RoundedBox>
          <RoundedBox
            args={[18.8, 22.8, 0.22]}
            radius={3}
            smoothness={4}
            position={[0, 0, -0.52]}
          >
            <meshBasicMaterial color="#d4d4d8" transparent opacity={0.95} />
          </RoundedBox>
          <Text
            position={[0, 0, 0.86]}
            maxWidth={14}
            fontSize={5.4}
            lineHeight={1.05}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            color="#111111"
            outlineWidth={0.03}
            outlineColor="#f5f5f5"
          >
            WARM
          </Text>
        </group>
      </Billboard>
    </group>
  );
}

function SelectableNode({
  node,
  selected,
  scale,
  onSelect,
  children,
}: {
  node: SceneNode;
  selected: boolean;
  scale: number;
  onSelect: (nodeId: string) => void;
  children: ReactNode;
}) {
  const groupRef = useRef<Group | null>(null);

  useEffect(() => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.traverse((child) => {
      child.userData.previewNodeId = node.id;
      if (child === groupRef.current) {
        child.userData.labelHelper = true;
      }
    });
  }, [node.id, selected]);

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      scale={selected ? scale : 1}
    >
      {selected ? <SelectionGlow node={node} /> : null}
      {children}
      {selected ? <NodeLabel node={node} /> : null}
    </group>
  );
}

function SelectionGlow({ node }: { node: SceneNode }) {
  const shape = String(node.meta?.shape ?? "");
  const layer = String(node.meta?.layer ?? "");

  return (
    <group>
      {shape === "chip" ? (
        <group position={node.position}>
          <Cylinder
            args={[
              Math.max(5.6, Math.min(node.size[0], node.size[2]) * 0.58),
              Math.max(5.6, Math.min(node.size[0], node.size[2]) * 0.58),
              Math.max(3.6, node.size[1] * 1.35),
              28,
            ]}
          >
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} />
          </Cylinder>
          <Cylinder
            args={[
              Math.max(5.2, Math.min(node.size[0], node.size[2]) * 0.54),
              Math.max(5.2, Math.min(node.size[0], node.size[2]) * 0.54),
              Math.max(3.2, node.size[1] * 1.24),
              24,
            ]}
          >
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.22} />
          </Cylinder>
        </group>
      ) : layer === "screen" ? (
        <group position={node.position} rotation={node.rotation}>
          <RoundedBox
            args={[node.size[0] * 1.1, node.size[1] * 1.1, node.size[2] * 1.12]}
            radius={Math.min(...node.size) * 0.09}
            smoothness={4}
          >
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.07} />
          </RoundedBox>
          <RoundedBox
            args={[node.size[0] * 1.06, node.size[1] * 1.06, node.size[2] * 1.08]}
            radius={Math.min(...node.size) * 0.08}
            smoothness={4}
          >
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
          </RoundedBox>
        </group>
      ) : (
        <group position={node.position} rotation={node.rotation}>
          <Box args={[node.size[0] * 1.12, node.size[1] * 1.12, node.size[2] * 1.12]}>
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.07} />
          </Box>
          <Box args={[node.size[0] * 1.08, node.size[1] * 1.08, node.size[2] * 1.08]}>
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
          </Box>
        </group>
      )}
    </group>
  );
}

export function SceneRenderer({
  scene,
  selectedNodeId,
  onSelectNode,
}: {
  scene: PreviewScene;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}) {
  const { invalidate } = useThree();
  const [animatedScene, setAnimatedScene] = useState(scene);
  const targetSceneRef = useRef(scene);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    targetSceneRef.current = scene;
    isAnimatingRef.current = true;
    setAnimatedScene((currentScene) => advanceSceneTowards(currentScene, scene));
    invalidate();
  }, [scene, invalidate]);

  useFrame(() => {
    if (!isAnimatingRef.current) {
      return;
    }

    const targetScene = targetSceneRef.current;

    setAnimatedScene((currentScene) => {
      const nextScene = advanceSceneTowards(currentScene, targetScene);

      if (isSceneSettled(nextScene, targetScene)) {
        isAnimatingRef.current = false;
        return targetScene;
      }

      return nextScene;
    });
  });

  const viewTransform = useMemo(() => {
    const nodes = [
      animatedScene.boardNode,
      ...animatedScene.moduleNodes,
      ...animatedScene.screenNodes,
      ...animatedScene.portNodes,
    ];

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const node of nodes) {
      const halfX = node.size[0] * 0.5;
      const halfY = node.size[1] * 0.5;
      const halfZ = node.size[2] * 0.5;
      minX = Math.min(minX, node.position[0] - halfX);
      minY = Math.min(minY, node.position[1] - halfY);
      minZ = Math.min(minZ, node.position[2] - halfZ);
      maxX = Math.max(maxX, node.position[0] + halfX);
      maxY = Math.max(maxY, node.position[1] + halfY);
      maxZ = Math.max(maxZ, node.position[2] + halfZ);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ, 1);
    const fitScale = animatedScene.view === "exploded" ? Math.min(1, 190 / maxSize) : 1;

    return {
      position: [-centerX, -centerY, -centerZ] as [number, number, number],
      scale: fitScale,
    };
  }, [animatedScene]);

  return (
    <group position={viewTransform.position} scale={viewTransform.scale}>
      <LabelWarmup />
      {animatedScene.view === "exploded"
        ? animatedScene.connections.map((connection) => (
            <ConnectionMesh
              key={connection.id}
              connection={connection}
              scene={animatedScene}
            />
          ))
        : null}
      <SelectableNode
        node={animatedScene.boardNode}
        selected={selectedNodeId === animatedScene.boardNode.id}
        scale={1.02}
        onSelect={onSelectNode}
      >
        <BoardMesh node={animatedScene.boardNode} />
      </SelectableNode>
      {animatedScene.moduleNodes.map((node) => (
        <SelectableNode
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          scale={1.04}
          onSelect={onSelectNode}
        >
          <ModuleMesh node={node} />
        </SelectableNode>
      ))}
      {animatedScene.screenNodes.map((node) => (
        <SelectableNode
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          scale={1.03}
          onSelect={onSelectNode}
        >
          <ScreenMesh node={node} />
        </SelectableNode>
      ))}
      {animatedScene.portNodes.map((node) => (
        <SelectableNode
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          scale={1.03}
          onSelect={onSelectNode}
        >
          <PortMesh node={node} />
        </SelectableNode>
      ))}
    </group>
  );
}
