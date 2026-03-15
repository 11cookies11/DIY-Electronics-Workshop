"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PreviewConnection, PreviewScene, SceneNode } from "@/engine/preview";

function getConnectionColor(kind: PreviewConnection["kind"]) {
  switch (kind) {
    case "power":
      return "#f59e0b";
    case "data":
      return "#34d399";
    case "signal":
      return "#60a5fa";
    default:
      return "#67e8f9";
  }
}

function getNodeAnchor(node: SceneNode): [number, number, number] {
  return [
    node.position[0],
    node.position[1] + node.size[1] * 0.5,
    node.position[2],
  ];
}

function getControlPoint(
  connection: PreviewConnection,
  start: THREE.Vector3,
  end: THREE.Vector3,
): [number, number, number] {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const delta = new THREE.Vector3().subVectors(end, start);
  const lateral = new THREE.Vector3(-delta.z, 0, delta.x)
    .normalize()
    .multiplyScalar(Math.min(26, Math.max(8, delta.length() * 0.12)));

  switch (connection.kind) {
    case "power":
      mid.y -= Math.max(12, delta.length() * 0.08);
      break;
    case "data":
      mid.y += Math.max(10, delta.length() * 0.12);
      mid.addScaledVector(lateral, 0.4);
      break;
    case "signal":
      mid.y += Math.max(16, delta.length() * 0.16);
      break;
    default:
      mid.y += Math.max(8, delta.length() * 0.1);
      mid.add(lateral);
      break;
  }

  return [mid.x, mid.y, mid.z];
}

function getPointOnQuadratic(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
) {
  const invT = 1 - t;
  const point = new THREE.Vector3();
  point.addScaledVector(start, invT * invT);
  point.addScaledVector(control, 2 * invT * t);
  point.addScaledVector(end, t * t);
  return point;
}

export function ConnectionMesh({
  connection,
  scene,
}: {
  connection: PreviewConnection;
  scene: PreviewScene;
}) {
  const lineRef = useRef<any>(null);
  const particleRef = useRef<THREE.Mesh>(null);

  const nodes = [
    scene.boardNode,
    ...scene.moduleNodes,
    ...scene.screenNodes,
    ...scene.portNodes,
  ];

  const fromNode = nodes.find((node) => node.id === connection.fromId);
  const toNode = nodes.find((node) => node.id === connection.toId);

  const startRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...(fromNode ? getNodeAnchor(fromNode) : [0, 0, 0])),
  );
  const endRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...(toNode ? getNodeAnchor(toNode) : [0, 0, 0])),
  );

  const targetStart = useMemo(
    () => (fromNode ? getNodeAnchor(fromNode) : null),
    [fromNode],
  );
  const targetEnd = useMemo(() => (toNode ? getNodeAnchor(toNode) : null), [toNode]);
  const color = getConnectionColor(connection.kind);

  useFrame((state) => {
    if (!targetStart || !targetEnd || !lineRef.current || !particleRef.current) {
      return;
    }

    startRef.current.lerp(new THREE.Vector3(...targetStart), 0.14);
    endRef.current.lerp(new THREE.Vector3(...targetEnd), 0.14);

    const control = getControlPoint(connection, startRef.current, endRef.current);
    lineRef.current.setPoints(
      startRef.current.toArray() as [number, number, number],
      endRef.current.toArray() as [number, number, number],
      control,
    );

    const speed =
      connection.kind === "power" ? 0.16 : connection.kind === "signal" ? 0.12 : 0.2;
    const t = (state.clock.getElapsedTime() * speed) % 1;
    const point = getPointOnQuadratic(
      startRef.current,
      new THREE.Vector3(...control),
      endRef.current,
      t,
    );

    particleRef.current.position.copy(point);
    const scale = 1 + Math.sin(state.clock.getElapsedTime() * 5) * 0.18;
    particleRef.current.scale.setScalar(scale);
  });

  if (!fromNode || !toNode || !targetStart || !targetEnd) {
    return null;
  }

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef}
        start={targetStart}
        end={targetEnd}
        mid={getControlPoint(
          connection,
          new THREE.Vector3(...targetStart),
          new THREE.Vector3(...targetEnd),
        )}
        color={color}
        lineWidth={1.8}
        transparent
        opacity={0.24}
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[1.2, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
      </mesh>
    </group>
  );
}
