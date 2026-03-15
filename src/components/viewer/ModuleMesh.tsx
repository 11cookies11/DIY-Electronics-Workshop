"use client";

import { Box } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

function getColor(category: unknown) {
  switch (String(category)) {
    case "core":
      return "#14b8a6";
    case "power":
      return "#f59e0b";
    case "communication":
      return "#3b82f6";
    case "sensor":
      return "#10b981";
    case "actuator":
      return "#8b5cf6";
    default:
      return "#94a3b8";
  }
}

export function ModuleMesh({ node }: { node: SceneNode }) {
  const color = getColor(node.meta?.category);

  return (
    <Box args={node.size} position={node.position}>
      <meshStandardMaterial color={color} roughness={0.36} metalness={0.24} />
    </Box>
  );
}
