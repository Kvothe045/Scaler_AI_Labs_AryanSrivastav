import type { NextConfig } from "next";

/**
 * Next.js Production Configuration
 * Configures Vercel to securely proxy API requests to the Azure VM,
 * bypassing all browser HTTP/HTTPS Mixed Content restrictions.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Intercept any client request starting with /api/v1/
        source: "/api/v1/:path*",
        // Securely forward it to your Azure VM from the Vercel backend
        destination: "http://20.193.130.195:8123/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;