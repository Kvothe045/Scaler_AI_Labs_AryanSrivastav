import type { NextConfig } from "next";

/**
 * Next.js Production Configuration
 * * Infrastructure Fix: Vercel's edge network strips trailing slashes before proxying. 
 * This causes strict backends to issue 307 Redirects that drop the forwarding port.
 * We resolve this by explicitly defining the trailing slash at the destination 
 * for all root collection endpoints, bypassing the redirect cycle entirely.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1. Explicit Overrides: Guarantee a trailing slash at the Azure VM destination.
      { source: "/api/v1/boards",  destination: "http://20.193.130.195:8123/api/v1/boards/" },
      { source: "/api/v1/boards/", destination: "http://20.193.130.195:8123/api/v1/boards/" },
      
      { source: "/api/v1/lists",   destination: "http://20.193.130.195:8123/api/v1/lists/" },
      { source: "/api/v1/lists/",  destination: "http://20.193.130.195:8123/api/v1/lists/" },
      
      { source: "/api/v1/cards",   destination: "http://20.193.130.195:8123/api/v1/cards/" },
      { source: "/api/v1/cards/",  destination: "http://20.193.130.195:8123/api/v1/cards/" },
      
      { source: "/api/v1/labels",  destination: "http://20.193.130.195:8123/api/v1/labels/" },
      { source: "/api/v1/labels/", destination: "http://20.193.130.195:8123/api/v1/labels/" },
      
      { source: "/api/v1/users",   destination: "http://20.193.130.195:8123/api/v1/users/" },
      { source: "/api/v1/users/",  destination: "http://20.193.130.195:8123/api/v1/users/" },

      // 2. Catch-all: For dynamic routes that do not require strict slashes (e.g., /boards/1, /auth/login)
      { source: "/api/v1/:path*",  destination: "http://20.193.130.195:8123/api/v1/:path*" },
    ];
  },
};

export default nextConfig;