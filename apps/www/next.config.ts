/** @type {import('next').NextConfig} */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nextConfig = {
  webpack(config) {
    config.module.rules.unshift({
      test: /\.(tsx|ts|jsx|js|mjs)$/,
      exclude: /node_modules/,
      enforce: "pre",
      use: [
        {
          loader: require.resolve("randomizer/bundler-plugin"),
          options: {},
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
