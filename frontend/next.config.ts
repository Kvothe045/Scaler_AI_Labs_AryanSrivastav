import type { NextConfig } from "next";

/**
 * Next.js Production Configuration
 * - trailingSlash: TRUE. Prevents Vercel from stripping slashes, ensuring 
 * the backend doesn't issue broken 307 Redirects that drop the port.
 * - rewrites(): Securely proxies client requests to the Azure VM.
 */
const nextConfig: NextConfig = {
  trailingSlash: true, 
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://20.193.130.195:8123/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;