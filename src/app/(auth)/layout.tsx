import Link from "next/link";
import { Wrench } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

// Layout para pantallas de auth (login, register, verify-email)
// Mobile-first: pantalla completa sin bottom nav ni topbar
// En desktop: panel centrado con imagen lateral
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header mínimo: solo logo */}
      <header className="flex h-14 items-center border-b border-border px-4 pt-safe">
        <Link
          href="/"
          aria-label="ManosYa — Volver al inicio"
          className="flex items-center gap-2 font-bold text-brand-600"
        >
          <Wrench aria-hidden="true" className="h-5 w-5" />
          <span>ManosYa</span>
        </Link>
      </header>

      {/* Contenido: full-screen en mobile, centrado en desktop */}
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-start px-4 py-6 md:justify-center"
        tabIndex={-1}
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
