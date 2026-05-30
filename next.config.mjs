/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
      },
      // Google profile pictures (Auth.js)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // Formatos modernos: AVIF primero, WebP como fallback
    formats: ["image/avif", "image/webp"],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=self, microphone=(), geolocation=self",
          },
        ],
      },
    ];
  },

  // Native addons (.node binaries) no pueden ser bundleados por webpack.
  // En Next.js 14 se llama serverComponentsExternalPackages (en 15+ es serverExternalPackages).
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2", "sharp"],
  },
};

export default nextConfig;
