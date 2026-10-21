import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/image/upload/**" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.fastly.steamstatic.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
  },
};

export default nextConfig;
