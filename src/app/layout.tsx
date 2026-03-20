import type { Metadata } from "next";
import "./globals.css";
import { DesktopScaleShell } from "@/components/lab/DesktopScaleShell";

export const metadata: Metadata = {
  title: "SecondMe Hello World",
  description: "A minimal hello world app for SecondMe exploration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body><DesktopScaleShell>{children}</DesktopScaleShell></body>
    </html>
  );
}
