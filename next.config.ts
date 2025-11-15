import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [{ hostname: "**" }],
  },
  experimental: {
	serverActions: {
	  bodySizeLimit: '60mb', // Increased to 60mb to account for request overhead (headers, form data, etc.)
	},
 },
};

export default withWhopAppConfig(nextConfig);
