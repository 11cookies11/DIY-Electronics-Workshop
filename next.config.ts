import type { NextConfig } from "next";

const defaultAllowedDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const extraAllowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraAllowedDevOrigins],
};

export default nextConfig;
