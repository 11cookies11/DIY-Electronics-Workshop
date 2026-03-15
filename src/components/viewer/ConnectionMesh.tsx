"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PreviewConnection, PreviewScene, SceneNode } from "@/engine/preview";

function getConnectionColor(kind: PreviewConnection["kind"]) {
  switch (kind) {
    case "power":
      return "#f59e0b";
    case "data":
      return "#22c55e";
    case "signal":
      return "#3b82f6";
    default:
      return "#67e8f9";
  }
}

function getNodeCenter(node: SceneNode): [number, number, number] {
  return [
    node.position[0],
    node.position[1] + node.size[1] * 0.5,
    node.position[2],
  ];
}

function getBoardStartAnchor(node: SceneNode): [number, number, number] {
  return [
    node.position[0],
    node.position[1] + node.size[1] * 0.5 + 1.5,
    node.position[2],
  ];
}

function getTargetAnchor(node: SceneNode): [number, number, number] {
  const center = getNodeCenter(node);
  const face = String(node.meta?.face ?? "");
  if (face) {
    return center;
  }
  return center;
}

function getRoutePoints(
  connection: PreviewConnection,
  scene: PreviewScene,
  fromNode: SceneNode,
  toNode: SceneNode,
): [number, number, number][] {
  const boardCenter = getNodeCenter(scene.boardNode);
  const start =
    fromNode.id === "main-board" ? getBoardStartAnchor(fromNode) : getTargetAnchor(fromNode);
  const end = getTargetAnchor(toNode);
  const endTop: [number, number, number] = [
    end[0],
    end[1] + toNode.size[1] * 0.5 + 4,
    end[2],
  ];

  const horizontalBiasX = end[0] >= boardCenter[0] ? 1 : -1;
  const horizontalBiasZ = end[2] >= boardCenter[2] ? 1 : -1;
  const outerX =
    boardCenter[0] + horizontalBiasX * (32 + Math.abs(end[0] - boardCenter[0]) * 0.45);
  const outerZ =
    boardCenter[2] + horizontalBiasZ * (32 + Math.abs(end[2] - boardCenter[2]) * 0.45);
  const preferX = Math.abs(end[0] - boardCenter[0]) >= Math.abs(end[2] - boardCenter[2]);
  const upperLane =
    Math.max(start[1], endTop[1], boardCenter[1]) +
    40 +
    Math.max(0, Math.abs(endTop[1] - boardCenter[1]) * 0.25);
  const lowerLane =
    Math.min(start[1], end[1], boardCenter[1]) -
    26 -
    Math.max(0, Math.abs(end[1] - boardCenter[1]) * 0.18);
  const sideLaneX = outerX;
  const sideLaneZ = outerZ;

  if (connection.kind === "power") {
    return [
      start,
      [start[0], lowerLane, start[2]],
      [end[0], lowerLane, start[2]],
      [end[0], lowerLane, end[2]],
      [end[0], end[1] - 4, end[2]],
      end,
    ];
  }

  if (connection.kind === "interface") {
    if (preferX) {
      return [
        start,
        [sideLaneX, start[1], start[2]],
        [sideLaneX, start[1], end[2]],
        [sideLaneX, end[1], end[2]],
        end,
      ];
    }

    return [
      start,
      [start[0], start[1], sideLaneZ],
      [end[0], start[1], sideLaneZ],
      [end[0], end[1], sideLaneZ],
      end,
    ];
  }

  if (connection.kind === "data") {
    if (preferX) {
      return [
        start,
        [sideLaneX, start[1], start[2]],
        [sideLaneX, upperLane - 10, start[2]],
        [sideLaneX, upperLane - 10, end[2]],
        [endTop[0], upperLane - 10, endTop[2]],
        endTop,
        end,
      ];
    }

    return [
      start,
      [start[0], start[1], sideLaneZ],
      [start[0], upperLane - 10, sideLaneZ],
      [end[0], upperLane - 10, sideLaneZ],
      [endTop[0], upperLane - 10, endTop[2]],
      endTop,
      end,
    ];
  }

  if (preferX) {
    return [
      start,
      [start[0], upperLane, start[2]],
      [outerX, upperLane, start[2]],
      [outerX, upperLane, endTop[2]],
      [endTop[0], upperLane, endTop[2]],
      endTop,
      end,
    ];
  }

  return [
    start,
    [start[0], upperLane, start[2]],
    [start[0], upperLane, outerZ],
    [endTop[0], upperLane, outerZ],
    [endTop[0], upperLane, endTop[2]],
    endTop,
    end,
  ];
}

function getPointAlongSegments(
  points: [number, number, number][],
  t: number,
): [number, number, number] {
  const vectors = points.map((point) => new THREE.Vector3(...point));
  const segmentLengths = vectors.slice(0, -1).map((point, index) => point.distanceTo(vectors[index + 1]));
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
  const targetLength = totalLength * t;
  let consumed = 0;

  for (let i = 0; i < segmentLengths.length; i += 1) {
    const segmentLength = segmentLengths[i];
    if (consumed + segmentLength >= targetLength) {
      const localT = (targetLength - consumed) / segmentLength;
      const pos = vectors[i].clone().lerp(vectors[i + 1], localT);
      return [pos.x, pos.y, pos.z];
    }
    consumed += segmentLength;
  }

  const last = vectors[vectors.length - 1];
  return [last.x, last.y, last.z];
}

export function ConnectionMesh({
  connection,
  scene,
}: {
  connection: PreviewConnection;
  scene: PreviewScene;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  const nodes = [
    scene.boardNode,
    ...scene.moduleNodes,
    ...scene.screenNodes,
    ...scene.portNodes,
  ];
  const fromNode = nodes.find((node) => node.id === connection.fromId);
  const toNode = nodes.find((node) => node.id === connection.toId);

  const points = useMemo(() => {
    if (!fromNode || !toNode) {
      return null;
    }
    return getRoutePoints(connection, scene, fromNode, toNode);
  }, [connection, fromNode, scene, toNode]);

  useFrame((state) => {
    if (!particleRef.current || !points) {
      return;
    }

    const speed =
      connection.kind === "power" ? 0.16 : connection.kind === "signal" ? 0.12 : 0.2;
    const t = (state.clock.getElapsedTime() * speed) % 1;
    const [x, y, z] = getPointAlongSegments(points, t);
    particleRef.current.position.set(x, y, z);
  });

  if (!fromNode || !toNode || !points) {
    return null;
  }

  const color = getConnectionColor(connection.kind);

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.9}
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[1.1, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} toneMapped={false} />
      </mesh>
    </group>
  );
}
