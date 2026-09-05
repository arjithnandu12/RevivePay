import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "ramble-geriatric-footbath.ngrok-free.dev",
  ],
  reactCompiler: true,

};

export default nextConfig;
