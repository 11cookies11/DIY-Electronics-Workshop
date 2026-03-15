"use client";

import { LabScene } from "./LabScene";
import { ShowcaseProvider } from "./showcase-context";
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
      <ShowcaseProvider>
        <LabScene {...props} />
      </ShowcaseProvider>
    </ThemeProvider>
  );
}
