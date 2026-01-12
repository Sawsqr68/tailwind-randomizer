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
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
