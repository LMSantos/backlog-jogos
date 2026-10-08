import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Game covers come already resized from the RAWG media server;
    // profile pictures come from Google sign-in.
    remotePatterns: [
      new URL("https://media.rawg.io/media/**"),
      new URL("https://lh3.googleusercontent.com/**"),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
