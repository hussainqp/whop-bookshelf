import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [{ hostname: "**" }],
  },
  experimental: {
	serverActions: {
	  bodySizeLimit: '50mb',
	},
 },
};

export default withWhopAppConfig(nextConfig);
