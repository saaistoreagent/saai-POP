import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', '@imgly/background-removal-node', 'sharp'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { dev }) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    if (dev) {
      // /public/generated/ 쓰기가 dev 서버 Fast Refresh 유발 차단
      const existing = Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : [];
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...existing, '**/public/generated/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
