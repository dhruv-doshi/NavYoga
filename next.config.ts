import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---------------------------------------------------------------------------
  // Security headers
  // Applied to all routes in production.
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable browser XSS protection (legacy but harmless)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Control referrer info sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — only camera is needed
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Image optimization
  // The app uses only SVG placeholders right now; keep default settings.
  // ---------------------------------------------------------------------------
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // ---------------------------------------------------------------------------
  // Compiler options
  // Remove console.log calls in production builds.
  // ---------------------------------------------------------------------------
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
};

export default nextConfig;
