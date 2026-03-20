"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

const BASE_WIDTH = Number(process.env.NEXT_PUBLIC_DESKTOP_BASE_WIDTH ?? "1920");
const BASE_HEIGHT = Number(process.env.NEXT_PUBLIC_DESKTOP_BASE_HEIGHT ?? "1080");
const MIN_SCALE = Number(process.env.NEXT_PUBLIC_DESKTOP_UI_SCALE_MIN ?? "0.76");
const MAX_SCALE = Number(process.env.NEXT_PUBLIC_DESKTOP_UI_SCALE_MAX ?? "1");
const FIXED_SCALE = Number(process.env.NEXT_PUBLIC_DESKTOP_UI_SCALE ?? "0.8");
const SCALE_MODE = process.env.NEXT_PUBLIC_DESKTOP_UI_SCALE_MODE ?? "adaptive";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveScale(width: number, height: number) {
  if (width <= 1024) return 1;

  if (SCALE_MODE === "fixed") {
    return clamp(FIXED_SCALE, MIN_SCALE, MAX_SCALE);
  }

  const adaptive = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  return clamp(adaptive, MIN_SCALE, MAX_SCALE);
}

export function DesktopScaleShell({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      setScale(resolveScale(window.innerWidth, window.innerHeight));
    };

    updateScale();
    window.addEventListener("resize", updateScale, { passive: true });
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const style = useMemo(
    () =>
      ({
        "--desktop-ui-scale": String(scale),
      }) as CSSProperties,
    [scale],
  );

  return (
    <div className="app-zoom-shell" style={style}>
      {children}
    </div>
  );
}
