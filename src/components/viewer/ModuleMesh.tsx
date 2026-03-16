"use client";

import { Box, Cylinder, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

function getColor(category: unknown) {
  switch (String(category)) {
    case "core":
      return "#7dd3c7";
    case "power":
      return "#f7c873";
    case "communication":
      return "#93c5fd";
    case "storage":
      return "#a5b4fc";
    case "sensor":
      return "#86efac";
    case "actuator":
      return "#c4b5fd";
    case "interface":
      return "#cbd5e1";
    case "thermal":
      return "#fda4af";
    case "mechanical":
      return "#d6d3d1";
    default:
      return "#e2e8f0";
  }
}

function ModuleMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.2} metalness={0.08} />;
}

function GenericPanel({
  size,
  color,
  position,
}: {
  size: [number, number, number];
  color: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={4}>
        <meshStandardMaterial color="#c4d4df" roughness={0.18} metalness={0.08} />
      </RoundedBox>
      <RoundedBox
        args={[size[0] * 0.88, Math.max(1.5, size[1] * 0.26), size[2] * 0.8]}
        radius={Math.min(...size) * 0.06}
        smoothness={4}
        position={[0, 0, size[2] * 0.06]}
      >
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.08} metalness={0.08} />
      </RoundedBox>
      <Box
        args={[size[0] * 0.1, Math.max(1, size[1] * 0.16), size[2] * 0.2]}
        position={[-size[0] * 0.34, -size[1] * 0.26, size[2] * 0.08]}
      >
        <meshStandardMaterial color="#fffaf0" roughness={0.12} metalness={0.16} />
      </Box>
    </group>
  );
}

function GenericChip({
  size,
  color,
  position,
}: {
  size: [number, number, number];
  color: string;
  position: [number, number, number];
}) {
  const radius = Math.max(3, Math.min(size[0], size[2]) * 0.42);

  return (
    <group position={position}>
      <Cylinder args={[radius, radius * 1.08, Math.max(2, size[1]), 24]}>
        <meshStandardMaterial color={color} roughness={0.16} metalness={0.08} />
      </Cylinder>
      <Cylinder
        args={[radius * 0.7, radius * 0.72, Math.max(0.9, size[1] * 0.16), 20]}
        position={[0, size[1] * 0.38, 0]}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.18} />
      </Cylinder>
      <Cylinder
        args={[radius * 0.16, radius * 0.16, Math.max(1.2, size[1] * 0.3), 18]}
        position={[0, -size[1] * 0.08, radius * 0.74]}
      >
        <meshStandardMaterial color="#8ba0b3" roughness={0.14} metalness={0.12} />
      </Cylinder>
    </group>
  );
}

function GenericBoard({
  size,
  color,
  position,
}: {
  size: [number, number, number];
  color: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <BoardWithChip size={size} color={color} accent="#e2e8f0" />
      {[-0.36, -0.24, -0.12, 0.12, 0.24, 0.36].map((offset) => (
        <Box
          key={offset}
          args={[Math.max(0.6, size[0] * 0.028), Math.max(1, size[1] * 0.24), size[2] * 0.14]}
          position={[size[0] * offset, -size[1] * 0.08, -size[2] * 0.42]}
        >
          <meshStandardMaterial color="#cbd5e1" roughness={0.18} metalness={0.9} />
        </Box>
      ))}
    </group>
  );
}

function GenericBoxModule({
  size,
  color,
  position,
}: {
  size: [number, number, number];
  color: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.08} />
      </RoundedBox>
      <Box
        args={[size[0] * 0.5, Math.max(1, size[1] * 0.12), size[2] * 0.3]}
        position={[0, size[1] * 0.34, 0]}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.14} />
      </Box>
      <Box
        args={[size[0] * 0.12, Math.max(1, size[1] * 0.2), size[2] * 0.16]}
        position={[size[0] * 0.34, 0, -size[2] * 0.26]}
      >
        <meshStandardMaterial color="#dbe4ec" roughness={0.12} metalness={0.16} />
      </Box>
    </group>
  );
}

function BoardWithChip({
  size,
  color,
  chipScale = 0.38,
  accent = "#cbd5e1",
}: {
  size: [number, number, number];
  color: string;
  chipScale?: number;
  accent?: string;
}) {
  return (
    <group>
      <RoundedBox args={size} radius={Math.min(...size) * 0.05} smoothness={3}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          roughness={0.2}
          metalness={0.08}
        />
      </RoundedBox>
      <Box
        args={[size[0] * chipScale, Math.max(2, size[1] * 0.45), size[2] * chipScale]}
        position={[0, size[1] * 0.42, 0]}
      >
        <meshStandardMaterial color="#d8e1e8" roughness={0.18} metalness={0.12} />
      </Box>
      <Box
        args={[size[0] * 0.18, Math.max(1.5, size[1] * 0.25), size[2] * 0.12]}
        position={[size[0] * 0.26, size[1] * 0.36, -size[2] * 0.28]}
      >
        <meshStandardMaterial color={accent} roughness={0.12} metalness={0.16} />
      </Box>
    </group>
  );
}

function renderSpecificModule(node: SceneNode, color: string) {
  const sourceId = String(node.meta?.sourceId ?? node.type);
  const size = node.size;

  switch (sourceId) {
    case "esp32":
    case "esp32_s3":
      return (
        <group position={node.position}>
          <BoardWithChip size={size} color={color} accent="#67e8f9" />
          <Box
            args={[size[0] * 0.68, Math.max(1.2, size[1] * 0.12), Math.max(4, size[2] * 0.16)]}
            position={[0, size[1] * 0.4, -size[2] * 0.38]}
          >
            <meshStandardMaterial color="#99f6e4" roughness={0.2} metalness={0.45} />
          </Box>
        </group>
      );
    case "stm32":
      return (
        <group position={node.position}>
          <BoardWithChip size={size} color={color} accent="#f8fafc" />
          <Box
            args={[size[0] * 0.2, Math.max(1.5, size[1] * 0.22), size[2] * 0.15]}
            position={[-size[0] * 0.28, size[1] * 0.36, size[2] * 0.22]}
          >
            <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
          </Box>
        </group>
      );
    case "raspberry_pi_cm5":
      return (
        <group position={node.position}>
          <BoardWithChip size={size} color="#14b8a6" chipScale={0.32} accent="#f8fafc" />
          <Box
            args={[size[0] * 0.28, Math.max(2, size[1] * 0.38), size[2] * 0.18]}
            position={[size[0] * 0.22, size[1] * 0.36, size[2] * 0.22]}
          >
            <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.9} />
          </Box>
        </group>
      );
    case "battery":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#a16207" roughness={0.45} metalness={0.08} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.86, Math.max(1.5, size[1] * 0.65), size[2] * 0.86]}
            position={[0, size[1] * 0.05, 0]}
          >
            <meshStandardMaterial color="#f59e0b" roughness={0.28} metalness={0.18} />
          </Box>
        </group>
      );
    case "dc_input":
    case "usb_c_power":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#92400e" roughness={0.3} metalness={0.2} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.62, size[1] * 0.34, size[2] * 0.22]}
            position={[0, 0, size[2] * 0.28]}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.86} />
          </Box>
        </group>
      );
    case "buck_converter":
      return (
        <group position={node.position}>
          <BoardWithChip size={size} color="#b45309" chipScale={0.24} accent="#facc15" />
          {[-0.22, 0.22].map((offset) => (
            <Cylinder
              key={offset}
              args={[Math.min(size[0], size[2]) * 0.12, Math.min(size[0], size[2]) * 0.12, Math.max(2, size[1] * 0.42), 20]}
              position={[size[0] * offset, size[1] * 0.38, 0]}
            >
              <meshStandardMaterial color="#94a3b8" roughness={0.22} metalness={0.52} />
            </Cylinder>
          ))}
        </group>
      );
    case "pmic":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#b45309" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.38, Math.max(1, size[1] * 0.18), size[2] * 0.38]}
            position={[0, size[1] * 0.34, 0]}
          >
            <meshStandardMaterial color="#fde68a" roughness={0.18} metalness={0.36} />
          </Box>
        </group>
      );
    case "camera_module":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={4}>
            <meshStandardMaterial color="#2dd4bf" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.22, Math.min(size[0], size[2]) * 0.28, Math.max(4, size[1] * 0.9), 24]}
            position={[0, size[1] * 0.58, 0]}
          >
            <meshStandardMaterial color="#334155" roughness={0.18} metalness={0.55} />
          </Cylinder>
        </group>
      );
    case "wifi":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#2563eb" roughness={0.26} metalness={0.16} />
          </RoundedBox>
          <Box
            args={[Math.max(1.2, size[0] * 0.08), Math.max(6, size[1] * 1.4), Math.max(1.2, size[2] * 0.08)]}
            position={[0, size[1] * 0.75, -size[2] * 0.2]}
          >
            <meshStandardMaterial color="#e0f2fe" roughness={0.18} metalness={0.82} />
          </Box>
        </group>
      );
    case "bluetooth":
      return (
        <group position={node.position}>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.38, Math.min(size[0], size[2]) * 0.38, size[1], 24]}
          >
            <meshStandardMaterial color="#60a5fa" roughness={0.24} metalness={0.18} />
          </Cylinder>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.12, Math.min(size[0], size[2]) * 0.12, Math.max(1, size[1] * 0.24), 18]}
            position={[0, size[1] * 0.45, 0]}
          >
            <meshStandardMaterial color="#bfdbfe" roughness={0.18} metalness={0.72} />
          </Cylinder>
        </group>
      );
    case "lte_4g":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.06} smoothness={3}>
            <meshStandardMaterial color="#3b82f6" roughness={0.28} metalness={0.18} />
          </RoundedBox>
          {[-0.16, 0.16].map((offset) => (
            <Box
              key={offset}
              args={[Math.max(1.2, size[0] * 0.06), Math.max(7, size[1] * 1.8), Math.max(1.2, size[2] * 0.06)]}
              position={[size[0] * offset, size[1] * 0.8, -size[2] * 0.18]}
            >
              <meshStandardMaterial color="#dbeafe" roughness={0.18} metalness={0.82} />
            </Box>
          ))}
        </group>
      );
    case "gps":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#2563eb" roughness={0.24} metalness={0.16} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.16, Math.min(size[0], size[2]) * 0.16, Math.max(1, size[1] * 0.25), 18]}
            position={[0, size[1] * 0.44, 0]}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.76} />
          </Cylinder>
        </group>
      );
    case "ethernet":
    case "rj45_port":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.05} smoothness={3}>
            <meshStandardMaterial color="#64748b" roughness={0.22} metalness={0.62} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.7, size[1] * 0.34, size[2] * 0.18]}
            position={[0, 0, size[2] * 0.34]}
          >
            <meshStandardMaterial color="#cbd5e1" roughness={0.16} metalness={0.88} />
          </Box>
        </group>
      );
    case "rs485":
    case "can":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#1e3a8a" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.62, Math.max(1.2, size[1] * 0.22), size[2] * 0.2]}
            position={[0, size[1] * 0.35, size[2] * 0.18]}
          >
            <meshStandardMaterial color="#e2e8f0" roughness={0.18} metalness={0.8} />
          </Box>
        </group>
      );
    case "microphone_array":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.06} smoothness={3}>
            <meshStandardMaterial color="#22c55e" roughness={0.28} metalness={0.18} />
          </RoundedBox>
          {[-0.28, 0, 0.28].map((offset) => (
            <Cylinder
              key={offset}
              args={[Math.min(size[0], size[2]) * 0.08, Math.min(size[0], size[2]) * 0.08, Math.max(1.5, size[1] * 0.35), 20]}
              position={[size[0] * offset, size[1] * 0.4, 0]}
            >
              <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.9} />
            </Cylinder>
          ))}
        </group>
      );
    case "temp_sensor":
    case "humidity_sensor":
    case "pressure_sensor":
    case "light_sensor":
    case "hall_sensor":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#15803d" roughness={0.26} metalness={0.14} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.26, Math.max(1, size[1] * 0.16), size[2] * 0.26]}
            position={[0, size[1] * 0.36, 0]}
          >
            <meshStandardMaterial color="#dcfce7" roughness={0.18} metalness={0.48} />
          </Box>
        </group>
      );
    case "imu_sensor":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#34d399" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.34, Math.max(1.2, size[1] * 0.18), size[2] * 0.34]}
            position={[0, size[1] * 0.36, 0]}
          >
            <meshStandardMaterial color="#bbf7d0" roughness={0.18} metalness={0.4} />
          </Box>
          <Box
            args={[size[0] * 0.1, Math.max(1, size[1] * 0.2), size[2] * 0.1]}
            position={[size[0] * 0.18, size[1] * 0.34, -size[2] * 0.16]}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.65} />
          </Box>
        </group>
      );
    case "distance_sensor":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#15803d" roughness={0.24} metalness={0.16} />
          </RoundedBox>
          {[-0.18, 0.18].map((offset) => (
            <Cylinder
              key={offset}
              args={[Math.min(size[0], size[2]) * 0.14, Math.min(size[0], size[2]) * 0.14, Math.max(2, size[1] * 0.28), 20]}
              position={[size[0] * offset, size[1] * 0.4, 0]}
            >
              <meshStandardMaterial color="#e2e8f0" roughness={0.16} metalness={0.82} />
            </Cylinder>
          ))}
        </group>
      );
    case "gas_sensor":
      return (
        <group position={node.position}>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.42, Math.min(size[0], size[2]) * 0.42, size[1], 24]}
          >
            <meshStandardMaterial color="#4ade80" roughness={0.26} metalness={0.14} />
          </Cylinder>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.26, Math.min(size[0], size[2]) * 0.26, Math.max(1.2, size[1] * 0.18), 20]}
            position={[0, size[1] * 0.42, 0]}
          >
            <meshStandardMaterial color="#dcfce7" roughness={0.18} metalness={0.36} />
          </Cylinder>
        </group>
      );
    case "current_sensor":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#15803d" roughness={0.26} metalness={0.16} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.18, Math.min(size[0], size[2]) * 0.18, Math.max(1.2, size[1] * 0.22), 20]}
            position={[0, size[1] * 0.38, 0]}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.7} />
          </Cylinder>
        </group>
      );
    case "relay_module":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#60a5fa" roughness={0.32} metalness={0.12} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.24, Math.max(2, size[1] * 0.35), size[2] * 0.84]}
            position={[-size[0] * 0.28, size[1] * 0.18, 0]}
          >
            <meshStandardMaterial color="#cbd5e1" roughness={0.18} metalness={0.85} />
          </Box>
        </group>
      );
    case "motor_driver":
    case "servo_driver":
    case "solenoid_driver":
      return (
        <group position={node.position}>
          <BoardWithChip size={size} color="#6d28d9" chipScale={0.22} accent="#f8fafc" />
          <Box
            args={[size[0] * 0.68, Math.max(1.5, size[1] * 0.24), size[2] * 0.18]}
            position={[0, size[1] * 0.36, size[2] * 0.28]}
          >
            <meshStandardMaterial color="#d8b4fe" roughness={0.18} metalness={0.58} />
          </Box>
        </group>
      );
    case "led_driver":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#7c3aed" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.14, Math.min(size[0], size[2]) * 0.14, Math.max(1, size[1] * 0.18), 18]}
            position={[0, size[1] * 0.34, 0]}
          >
            <meshStandardMaterial color="#f5d0fe" roughness={0.18} metalness={0.42} />
          </Cylinder>
        </group>
      );
    case "infrared_blaster":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#6d28d9" roughness={0.28} metalness={0.16} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.16, Math.min(size[0], size[2]) * 0.16, Math.max(1.5, size[1] * 0.28), 20]}
            position={[0, size[1] * 0.38, size[2] * 0.12]}
          >
            <meshStandardMaterial color="#fecdd3" roughness={0.18} metalness={0.34} />
          </Cylinder>
        </group>
      );
    case "buzzer":
      return (
        <group position={node.position}>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.42, Math.min(size[0], size[2]) * 0.42, size[1], 28]}
          >
            <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.22} />
          </Cylinder>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.18, Math.min(size[0], size[2]) * 0.18, Math.max(1, size[1] * 0.2), 20]}
            position={[0, size[1] * 0.48, 0]}
          >
            <meshStandardMaterial color="#94a3b8" roughness={0.22} metalness={0.5} />
          </Cylinder>
        </group>
      );
    case "sd_card_slot":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.05} smoothness={3}>
            <meshStandardMaterial color="#94a3b8" roughness={0.28} metalness={0.55} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.78, Math.max(1, size[1] * 0.16), size[2] * 0.28]}
            position={[0, size[1] * 0.32, size[2] * 0.12]}
          >
            <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.35} />
          </Box>
        </group>
      );
    case "nor_flash":
    case "nand_flash":
    case "eeprom":
    case "emmc_chip":
    case "sram_chip":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.08} smoothness={3}>
            <meshStandardMaterial color="#818cf8" roughness={0.28} metalness={0.2} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.7, Math.max(0.8, size[1] * 0.12), size[2] * 0.7]}
            position={[0, size[1] * 0.38, 0]}
          >
            <meshStandardMaterial color="#a5b4fc" roughness={0.18} metalness={0.6} />
          </Box>
        </group>
      );
    case "nvme_ssd":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.04} smoothness={3}>
            <meshStandardMaterial color="#a78bfa" roughness={0.26} metalness={0.16} />
          </RoundedBox>
          <Box
            args={[size[0] * 0.12, Math.max(1.2, size[1] * 0.2), size[2] * 0.85]}
            position={[-size[0] * 0.38, size[1] * 0.25, 0]}
          >
            <meshStandardMaterial color="#e2e8f0" roughness={0.16} metalness={0.88} />
          </Box>
        </group>
      );
    case "heatsink":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.04} smoothness={3}>
            <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.72} />
          </RoundedBox>
          {[-0.24, -0.08, 0.08, 0.24].map((offset) => (
            <Box
              key={offset}
              args={[size[0] * 0.12, size[1] * 0.75, size[2] * 0.92]}
              position={[size[0] * offset, size[1] * 0.35, 0]}
            >
              <meshStandardMaterial color="#94a3b8" roughness={0.24} metalness={0.86} />
            </Box>
          ))}
        </group>
      );
    case "cooling_fan":
      return (
        <group position={node.position}>
          <RoundedBox args={size} radius={Math.min(...size) * 0.05} smoothness={3}>
            <meshStandardMaterial color="#94a3b8" roughness={0.34} metalness={0.22} />
          </RoundedBox>
          <Cylinder
            args={[Math.min(size[0], size[2]) * 0.28, Math.min(size[0], size[2]) * 0.28, Math.max(1, size[1] * 0.2), 24]}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, size[2] * 0.02]}
          >
            <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.4} />
          </Cylinder>
        </group>
      );
    default:
      return null;
  }
}

export function ModuleMesh({ node }: { node: SceneNode }) {
  const color = getColor(node.meta?.category);
  const shape = String(node.meta?.shape ?? "box");
  const specific = renderSpecificModule(node, color);

  if (specific) {
    return specific;
  }

  if (shape === "panel") {
    return <GenericPanel size={node.size} color={color} position={node.position} />;
  }

  if (shape === "chip") {
    return <GenericChip size={node.size} color={color} position={node.position} />;
  }

  if (shape === "board") {
    return <GenericBoard size={node.size} color={color} position={node.position} />;
  }

  return <GenericBoxModule size={node.size} color={color} position={node.position} />;
}
