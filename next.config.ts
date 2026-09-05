import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "ramble-geriatric-footbath.ngrok-free.dev",
  ],
  reactCompiler: true,
  devIndicators:false

};

export default nextConfig;
