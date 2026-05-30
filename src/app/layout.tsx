import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "ManosYa — Servicios profesionales a domicilio en CABA y GBA",
    template: "%s | ManosYa",
  },
  description:
    "Encontrá plomeros, electricistas, gasistas matriculados, pintores y más en tu barrio. Pedí presupuesto gratis, leé reseñas y contratá con confianza.",
  keywords: [
    "servicios a domicilio",
    "plomero",
    "electricista",
    "gasista matriculado",
    "pintor",
    "CABA",
    "GBA",
    "Buenos Aires",
    "presupuesto gratis",
  ],
  authors: [{ name: "ManosYa" }],
  creator: "ManosYa",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "ManosYa",
    title: "ManosYa — Servicios profesionales a domicilio",
    description:
      "Encontrá plomeros, electricistas, gasistas y más en tu barrio. Presupuesto gratis.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "ManosYa — Marketplace de servicios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ManosYa — Servicios profesionales a domicilio",
    description: "Encontrá plomeros, electricistas, gasistas y más en tu barrio.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

// Viewport separado de metadata (requerido en Next.js 14+)
export const viewport: Viewport = {
  // viewport crítico para mobile-first
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // permitir zoom manual (accesibilidad)
  userScalable: true,
  // soporte para safe areas (notch / Dynamic Island)
  viewportFit: "cover",
  // Con resizes-content, el layout viewport se achica cuando el teclado abre.
  // Esto hace que position:fixed bottom-0 siempre flote POR ENCIMA del teclado
  // en iOS Safari 16+ y Android Chrome. Sin esto, el teclado tapa el botón fijo.
  interactiveWidget: "resizes-content",
  // Color del status bar en PWA
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* DNS prefetch para dominios externos frecuentes */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//lh3.googleusercontent.com" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
