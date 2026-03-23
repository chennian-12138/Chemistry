import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,  // 忽略类型错误
  },
  images: {
    unoptimized: true, // 允许直接加载 localhost 后端图片，跳过 Next.js 的二次优化（我们已经在后端压缩过了）
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
      // You can add production hostname here later if needed
    ],
  },
};

export default nextConfig;
