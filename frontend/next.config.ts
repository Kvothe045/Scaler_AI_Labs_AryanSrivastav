import type { NextConfig } from "next";

/**
 * Next.js Configuration
 * Includes a rewrite rule to act as a reverse proxy for the Azure VM backend.
 * This completely resolves browser Mixed Content (HTTPS -> HTTP) blocking.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Intercept any request from the frontend that starts with /api/v1/
        source: "/api/v1/:path*",
        // Proxy it securely server-side to the HTTP Azure VM
        destination: "http://20.193.130.195:8123/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;