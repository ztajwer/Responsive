import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "three-stdlib"],
  webpack: (config, { isServer }) => {
    // Only customize client bundles — server splitChunks corrupts .next chunk IDs in dev.
    if (!isServer) {
      if (config.output) {
        config.output.chunkLoadTimeout = 300000;
      }

      config.optimization = config.optimization ?? {};
      const splitChunks = config.optimization.splitChunks ?? {};
      config.optimization.splitChunks = {
        ...splitChunks,
        cacheGroups: {
          ...splitChunks.cacheGroups,
          r3f: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: "r3f-vendor",
            chunks: "all",
            priority: 40,
            reuseExistingChunk: true,
          },
        },
      };
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
