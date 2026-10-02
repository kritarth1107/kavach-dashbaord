import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Saheli's chat lives on WhatsApp only; old dashboard chat links land on Today.
  async redirects() {
    return [{ source: "/dashboard/chat", destination: "/dashboard/saheli", permanent: false }];
  },
};

export default nextConfig;
