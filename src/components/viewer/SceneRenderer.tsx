"use client";

import { Box, Cylinder, Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
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

function formatNodeLabel(node: SceneNode) {
  const sourceId =
    String(node.meta?.sourceId ?? node.meta?.componentType ?? node.type ?? "")
      .trim()
      .toLowerCase();

  const labelMap: Record<string, string> = {
    "main-board": "主板",
    esp32: "ESP32 开发板",
    esp32_s3: "ESP32-S3 开发板",
    stm32: "STM32 主控板",
    raspberry_pi_cm5: "树莓派 CM5",
    battery: "电池模块",
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
    motor_driver: "电机驱动",
    servo_driver: "舵机驱动",
    solenoid_driver: "电磁驱动模块",
    led_driver: "状态灯",
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

function NodeLabel({ node }: { node: SceneNode }) {
  const anchorX = node.size[0] * 0.5;

  return (
    <Html position={[anchorX, 0, 0]} distanceFactor={8} style={{ pointerEvents: "none" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: 1.06 }}
        className="pointer-events-none flex select-none items-center gap-2"
        style={{ transform: "translate(12px, -50%)" }}
      >
        <div className="h-px w-4 bg-cyan-400/80" />
        <div className="rounded px-2 py-1 text-[10px] font-mono uppercase tracking-tight border border-cyan-300/75 bg-slate-950/80 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.14)] backdrop-blur-md">
          {formatNodeLabel(node)}
        </div>
      </motion.div>
    </Html>
  );
}

function SelectionGlow({ node }: { node: SceneNode }) {
  const shape = String(node.meta?.shape ?? "");
  const layer = String(node.meta?.layer ?? "");

  return (
    <group>
      <pointLight
        position={node.position}
        color="#67e8f9"
        intensity={2200}
        distance={90}
        decay={1.6}
      />
      {shape === "chip" ? (
        <Cylinder
          args={[
            Math.max(5, Math.min(node.size[0], node.size[2]) * 0.52),
            Math.max(5, Math.min(node.size[0], node.size[2]) * 0.52),
            Math.max(3, node.size[1] * 1.2),
            24,
          ]}
          position={node.position}
        >
          <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.26} />
        </Cylinder>
      ) : layer === "screen" ? (
        <RoundedBox
          args={[node.size[0] * 1.06, node.size[1] * 1.06, node.size[2] * 1.06]}
          radius={Math.min(...node.size) * 0.08}
          smoothness={4}
          position={node.position}
          rotation={node.rotation}
        >
          <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.2} />
        </RoundedBox>
      ) : (
        <Box
          args={[node.size[0] * 1.08, node.size[1] * 1.08, node.size[2] * 1.08]}
          position={node.position}
          rotation={node.rotation}
        >
          <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.2} />
        </Box>
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
  const [animatedScene, setAnimatedScene] = useState(scene);
  const targetSceneRef = useRef(scene);

  useEffect(() => {
    targetSceneRef.current = scene;
  }, [scene]);

  useFrame(() => {
    const targetScene = targetSceneRef.current;

    setAnimatedScene((currentScene) => ({
      view: targetScene.view,
      shellNode: interpolateNode(currentScene.shellNode, targetScene.shellNode, 0.12),
      boardNode: interpolateNode(currentScene.boardNode, targetScene.boardNode, 0.14),
      moduleNodes: interpolateNodeList(
        currentScene.moduleNodes,
        targetScene.moduleNodes,
        currentScene.boardNode.position,
        0.14,
      ),
      screenNodes: interpolateNodeList(
        currentScene.screenNodes,
        targetScene.screenNodes,
        currentScene.boardNode.position,
        0.16,
      ),
      portNodes: interpolateNodeList(
        currentScene.portNodes,
        targetScene.portNodes,
        currentScene.boardNode.position,
        0.16,
      ),
      connections: targetScene.connections,
    }));
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
      {animatedScene.view === "exploded"
        ? animatedScene.connections.map((connection) => (
            <ConnectionMesh
              key={connection.id}
              connection={connection}
              scene={animatedScene}
            />
          ))
        : null}
      <group
        onClick={(event) => {
          event.stopPropagation();
          onSelectNode(animatedScene.boardNode.id);
        }}
        scale={selectedNodeId === animatedScene.boardNode.id ? 1.02 : 1}
      >
        {selectedNodeId === animatedScene.boardNode.id ? (
          <SelectionGlow node={animatedScene.boardNode} />
        ) : null}
        <BoardMesh node={animatedScene.boardNode} />
        {selectedNodeId === animatedScene.boardNode.id ? (
          <NodeLabel node={animatedScene.boardNode} />
        ) : null}
      </group>
      {animatedScene.moduleNodes.map((node) => (
        <group
          key={node.id}
          onClick={(event) => {
            event.stopPropagation();
            onSelectNode(node.id);
          }}
          scale={selectedNodeId === node.id ? 1.04 : 1}
        >
          {selectedNodeId === node.id ? <SelectionGlow node={node} /> : null}
          <ModuleMesh node={node} />
          {selectedNodeId === node.id ? <NodeLabel node={node} /> : null}
        </group>
      ))}
      {animatedScene.screenNodes.map((node) => (
        <group
          key={node.id}
          onClick={(event) => {
            event.stopPropagation();
            onSelectNode(node.id);
          }}
          scale={selectedNodeId === node.id ? 1.03 : 1}
        >
          {selectedNodeId === node.id ? <SelectionGlow node={node} /> : null}
          <ScreenMesh node={node} />
          {selectedNodeId === node.id ? <NodeLabel node={node} /> : null}
        </group>
      ))}
      {animatedScene.portNodes.map((node) => (
        <group
          key={node.id}
          onClick={(event) => {
            event.stopPropagation();
            onSelectNode(node.id);
          }}
          scale={selectedNodeId === node.id ? 1.03 : 1}
        >
          {selectedNodeId === node.id ? <SelectionGlow node={node} /> : null}
          <PortMesh node={node} />
          {selectedNodeId === node.id ? <NodeLabel node={node} /> : null}
        </group>
      ))}
    </group>
  );
}
