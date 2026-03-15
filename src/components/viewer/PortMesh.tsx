"use client";

import { Box, Cylinder, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

const PORT_COLORS: Record<string, string> = {
  usb_c: "#475569",
  rj45: "#334155",
  audio_jack: "#64748b",
  power_jack: "#7c3aed",
  button_cutout: "#0f766e",
  ir_window: "#be123c",
  port: "#475569",
};

function PortMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.3} metalness={0.55} />;
}

export function PortMesh({ node }: { node: SceneNode }) {
  const type = String(node.meta?.componentType ?? node.type);
  const color = PORT_COLORS[type] ?? PORT_COLORS.port;

  if (type === "audio_jack" || type === "power_jack") {
    return (
      <Cylinder
        args={[
          Math.max(2, Math.min(node.size[0], node.size[1]) * 0.45),
          Math.max(2, Math.min(node.size[0], node.size[1]) * 0.45),
          Math.max(4, node.size[2]),
          20,
        ]}
        position={node.position}
        rotation={node.rotation}
      >
        <PortMaterial color={color} />
      </Cylinder>
    );
  }

  if (type === "usb_c") {
    return (
      <RoundedBox
        args={node.size}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.12}
        smoothness={3}
        position={node.position}
        rotation={node.rotation}
      >
        <PortMaterial color={color} />
      </RoundedBox>
    );
  }

  if (type === "rj45") {
    return (
      <Box args={node.size} position={node.position} rotation={node.rotation}>
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.62} />
      </Box>
    );
  }

  if (type === "ir_window") {
    return (
      <RoundedBox
        args={node.size}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.16}
        smoothness={3}
        position={node.position}
        rotation={node.rotation}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.24}
          roughness={0.22}
          metalness={0.18}
        />
      </RoundedBox>
    );
  }

  return (
    <Box args={node.size} position={node.position} rotation={node.rotation}>
      <PortMaterial color={color} />
    </Box>
  );
}
