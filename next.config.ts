import type { NextConfig } from "next";

// Static export so the site can be hosted anywhere (GitHub Pages, Vercel, Netlify).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
