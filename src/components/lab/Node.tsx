"use client";

import { Box, Cylinder, Html, Sphere, shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { type LabNode, THEME } from "./constants";

const ScreenMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(THEME.primary),
    uOpacity: 0.9,
    uIsSelected: false,
  },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform bool uIsSelected;
  varying vec2 vUv;

  mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0., s, 0., 1., 0., -s, 0., c);
  }

  mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1., 0., 0., 0., c, -s, 0., s, c);
  }

  float sdBoxFrame(vec3 p, vec3 b, float e) {
    p = abs(p) - b;
    vec3 q = abs(p + e) - e;
    return min(min(
      length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
      length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
      length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 0.0, 2.0);
    vec3 rd = normalize(vec3(uv, -1.2));
    float t = uTime * 0.8;
    mat3 rot = rotateY(t) * rotateX(t * 0.5);
    vec3 baseColor = uIsSelected ? vec3(1.0, 0.35, 0.35) : uColor;
    float d = 0.0;
    float glow = 0.0;

    for (int i = 0; i < 40; i++) {
      vec3 p = ro + rd * d;
      vec3 pRot = p * rot;
      float dist = sdBoxFrame(pRot, vec3(0.35), 0.012);
      glow += 0.012 / (dist + 0.035);
      if (dist < 0.001 || d > 5.0) break;
      d += dist;
    }

    float grid = (step(0.98, fract(vUv.x * 10.0)) + step(0.98, fract(vUv.y * 10.0))) * 0.05;
    float scanline = sin(vUv.y * 200.0 + uTime * 5.0) * 0.01 + 0.99;
    gl_FragColor = vec4(baseColor * (glow + grid) * scanline, uOpacity);
  }
  `,
);

extend({ ScreenMaterial });

export function Node({
  node,
  isExploded,
  isSelected,
  onClick,
}: {
  node: LabNode;
  isExploded: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<{ uTime: number; uIsSelected: boolean } | null>(null);
  const targetPos = useMemo(() => (isExploded ? node.explodedPos : node.assembledPos), [isExploded, node]);
  const screenMaterialInstance = useMemo(() => new (ScreenMaterial as unknown as new () => THREE.ShaderMaterial)(), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPos[0], 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPos[1], 0.05);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetPos[2], 0.05);

      if (isExploded) {
        groupRef.current.rotation.y += 0.005;
        groupRef.current.rotation.x += 0.002;
      } else {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.08);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.08);
      }
    }

    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
      materialRef.current.uIsSelected = isSelected;
    }

    if (screenMaterialInstance) {
      screenMaterialInstance.uniforms.uColor.value = new THREE.Color(isSelected ? THEME.secondary : THEME.primary);
    }
  });

  const screenRotation = (): [number, number, number] => {
    switch (node.id) {
      case "screen_back":
        return [0, Math.PI, 0];
      case "screen_top":
        return [-Math.PI / 2, 0, 0];
      case "screen_bottom":
        return [Math.PI / 2, 0, 0];
      case "screen_left":
        return [0, -Math.PI / 2, 0];
      case "screen_right":
        return [0, Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  };

  const renderGeometry = () => {
    switch (node.type) {
      case "sensor":
        return (
          <group>
            <Box args={[0.25, 0.06, 0.25]}>
              <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
            </Box>
            <Box args={[0.08, 0.08, 0.08]} position={[0, 0.04, 0]}>
              <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={2} />
            </Box>
          </group>
        );
      case "mcu":
        return (
          <group>
            <Box args={[0.3, 0.08, 0.3]}>
              <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
            </Box>
            {[...Array(8)].map((_, i) => (
              <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
                <Box args={[0.01, 0.01, 0.35]} position={[0.12, -0.04, 0]}>
                  <meshStandardMaterial color="#ffaa00" metalness={1} />
                </Box>
              </group>
            ))}
          </group>
        );
      case "screen":
        return (
          <group rotation={screenRotation()}>
            <Box args={[0.9, 0.9, 0.05]}>
              <meshStandardMaterial color="#101216" roughness={0.5} metalness={0.5} />
            </Box>
            <mesh position={[0, 0, 0.026]}>
              <planeGeometry args={[0.85, 0.85]} />
              <primitive
                object={screenMaterialInstance}
                attach="material"
                ref={materialRef}
              />
            </mesh>
          </group>
        );
      case "battery":
        return (
          <group>
            <Box args={[0.4, 0.2, 0.4]}>
              <meshStandardMaterial color="#222" />
            </Box>
            <Box args={[0.38, 0.18, 0.38]}>
              <meshStandardMaterial color={THEME.power} emissive={THEME.power} emissiveIntensity={isSelected ? 5 : 1} toneMapped={false} />
            </Box>
          </group>
        );
      case "speaker":
        return (
          <group>
            <Cylinder args={[0.15, 0.15, 0.1, 32]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#333" />
            </Cylinder>
            <Cylinder args={[0.12, 0.12, 0.11, 32]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#111" />
            </Cylinder>
          </group>
        );
      case "network":
        return (
          <group>
            <Box args={[0.2, 0.05, 0.2]}>
              <meshStandardMaterial color="#1a1a1a" />
            </Box>
            <Box args={[0.15, 0.06, 0.15]}>
              <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={isSelected ? 5 : 1} toneMapped={false} />
            </Box>
          </group>
        );
      default:
        return (
          <Sphere args={[0.2]}>
            <meshStandardMaterial color="white" />
          </Sphere>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {renderGeometry()}
      <Html distanceFactor={8} position={[0, 0.8, 0]} center>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isSelected ? 1 : isExploded ? 0.45 : 0, scale: isSelected ? 1.08 : 1 }}
          className="pointer-events-none select-none"
        >
          <div
            className={`rounded px-2 py-1 text-[9px] font-mono backdrop-blur-md ${
              isSelected
                ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                : "border border-white/10 bg-black/60 text-white/40"
            }`}
          >
            {node.label}
          </div>
        </motion.div>
      </Html>
    </group>
  );
}
