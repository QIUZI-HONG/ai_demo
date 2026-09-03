import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages 部署在 /ai_demo/ 子路径下，仅线上构建时启用，不影响本地
  basePath: process.env.PAGES_BASE_PATH || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
