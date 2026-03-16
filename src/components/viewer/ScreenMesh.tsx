"use client";

import { Circle, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function ScreenMesh({ node }: { node: SceneNode }) {
  const type = String(node.meta?.componentType ?? node.type);
  const width = node.size[0];
  const height = node.size[1];
  const thickness = node.size[2];
  const isRoundLike = width === height && width <= 40;

  if (type === "touch_display" && isRoundLike) {
    const radius = Math.min(width, height) * 0.48;

    return (
      <group position={node.position} rotation={node.rotation}>
        <Circle args={[radius, 40]}>
          <meshStandardMaterial color="#9fb7c8" roughness={0.2} metalness={0.18} />
        </Circle>
        <Circle args={[radius * 0.82, 40]} position={[0, 0, thickness * 0.08]}>
          <meshStandardMaterial
            color="#dcfce7"
            emissive="#86efac"
            emissiveIntensity={0.85}
            roughness={0.08}
            metalness={0.12}
          />
        </Circle>
      </group>
    );
  }

  return (
    <group position={node.position} rotation={node.rotation}>
      <RoundedBox
        args={[width, height, thickness]}
        radius={Math.min(width, height, thickness) * 0.08}
        smoothness={4}
      >
        <meshStandardMaterial color="#9eb8cc" roughness={0.18} metalness={0.14} />
      </RoundedBox>
      <RoundedBox
        args={[width * 0.88, height * 0.84, Math.max(1.2, thickness * 0.55)]}
        radius={Math.min(width, height, thickness) * 0.06}
        smoothness={4}
        position={[0, 0, thickness * 0.08]}
      >
        <meshStandardMaterial
          color="#e0f2fe"
          emissive="#7dd3fc"
          emissiveIntensity={type === "touch_display" ? 1.08 : 0.84}
          roughness={0.08}
          metalness={0.1}
        />
      </RoundedBox>
      {type === "touch_display" ? (
        <RoundedBox
          args={[width * 0.94, height * 0.9, Math.max(0.8, thickness * 0.22)]}
          radius={Math.min(width, height, thickness) * 0.05}
          smoothness={4}
          position={[0, 0, thickness * 0.18]}
        >
          <meshStandardMaterial color="#ffffff" transparent opacity={0.28} roughness={0.03} metalness={0.04} />
        </RoundedBox>
      ) : null}
    </group>
  );
}
