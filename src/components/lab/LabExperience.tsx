"use client";

import { LabScene } from "./LabScene";
import { ThemeProvider } from "./theme-context";

export function LabExperience(props: {
  isConnected: boolean;
  connectedFromCallback: boolean;
  error?: string;
  userInfo?: Record<string, unknown> | null;
  userInfoError?: string | null;
}) {
  return (
    <ThemeProvider>
      <LabScene {...props} />
    </ThemeProvider>
  );
}
