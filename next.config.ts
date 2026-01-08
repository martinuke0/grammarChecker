import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable dev indicator icon in bottom-left corner
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
