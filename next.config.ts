import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@react-three/fiber", "@react-three/drei", "three-stdlib"],
  webpack: (config, { isServer }) => {
    const threeModule = path.resolve(__dirname, "node_modules/three/build/three.module.js");

    config.resolve.alias = {
      ...config.resolve.alias,
      three: threeModule,
    };

    if (!isServer && config.output) {
      config.output.chunkLoadTimeout = 300000;
    }

    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/:path*.glb",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*.mp3",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*.(png|jpg|jpeg|webp|avif)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
