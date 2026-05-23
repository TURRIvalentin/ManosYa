import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir imágenes desde los dominios de storage
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

  experimental: {
    // Server Actions habilitado por defecto en Next.js 14
    // typedRoutes ayuda a detectar rutas inválidas en tiempo de compilación
    typedRoutes: true,
  },
};

export default nextConfig;
