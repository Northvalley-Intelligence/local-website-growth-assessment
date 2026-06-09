import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@northvalleyintel/assessment-shared",
    "@northvalleyintel/assessment-worker"
  ]
};

export default nextConfig;
