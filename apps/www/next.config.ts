/** @type {import('next').NextConfig} */

import { createRequire } from "node:module";
import type { Configuration } from "webpack";
const require = createRequire(import.meta.url);

const nextConfig = {
  webpack(config: Configuration) {
    config.module?.rules?.unshift({
      test: /\.(tsx|ts|jsx|js|mjs)$/,
      exclude: /node_modules/,
      enforce: "pre",
      use: [
        {
          loader: require.resolve("tailwind-randomizer/bundler-plugin"),
          options: {},
        },
      ],
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
