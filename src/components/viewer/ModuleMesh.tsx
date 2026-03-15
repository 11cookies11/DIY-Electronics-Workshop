"use client";

import { Box, Cylinder, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

function getColor(category: unknown) {
  switch (String(category)) {
    case "core":
      return "#14b8a6";
    case "power":
      return "#f59e0b";
    case "communication":
      return "#3b82f6";
    case "storage":
      return "#6366f1";
    case "sensor":
      return "#10b981";
    case "actuator":
      return "#8b5cf6";
    case "interface":
      return "#64748b";
    case "thermal":
      return "#ef4444";
    case "mechanical":
      return "#78716c";
    default:
      return "#94a3b8";
  }
}

function ModuleMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.36} metalness={0.24} />;
}

export function ModuleMesh({ node }: { node: SceneNode }) {
  const color = getColor(node.meta?.category);
  const shape = String(node.meta?.shape ?? "box");

  if (shape === "panel") {
    return (
      <RoundedBox
        args={node.size}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.08}
        smoothness={4}
        position={node.position}
      >
        <ModuleMaterial color={color} />
      </RoundedBox>
    );
  }

  if (shape === "chip") {
    return (
      <Cylinder
        args={[
          Math.max(3, Math.min(node.size[0], node.size[2]) * 0.42),
          Math.max(3, Math.min(node.size[0], node.size[2]) * 0.46),
          Math.max(2, node.size[1]),
          20,
        ]}
        position={node.position}
      >
        <ModuleMaterial color={color} />
      </Cylinder>
    );
  }

  if (shape === "board") {
    return (
      <RoundedBox
        args={node.size}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.05}
        smoothness={3}
        position={node.position}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.34}
          metalness={0.18}
        />
      </RoundedBox>
    );
  }

  return (
    <Box args={node.size} position={node.position}>
      <ModuleMaterial color={color} />
    </Box>
  );
}
