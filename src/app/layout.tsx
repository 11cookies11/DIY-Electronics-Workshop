import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
