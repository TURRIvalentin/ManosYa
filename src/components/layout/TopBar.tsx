"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, MessageCircle, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, activePattern: /^\/$/ },
  { href: "/buscar", label: "Buscar", icon: Search, activePattern: /^\/buscar/ },
  { href: "/pedidos", label: "Mis Pedidos", icon: ClipboardList, activePattern: /^\/pedidos/ },
  {
    href: "/mensajes",
    label: "Mensajes",
    icon: MessageCircle,
    activePattern: /^\/mensajes/,
  },
  { href: "/perfil", label: "Mi Perfil", icon: User, activePattern: /^\/perfil/ },
] as const;

export function TopBar() {
  const pathname = usePathname();

  return (
    // Solo visible en desktop (≥ md). Altura fija + safe area superior.
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50",
        "hidden md:block",
        "border-b border-border bg-background/95 backdrop-blur-sm",
        // Safe area para escritorio con barra de sistema (MacOS notch)
        "pt-safe",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          aria-label="ManosYa — Inicio"
          className="flex items-center gap-2 font-bold text-brand-600"
        >
          <Wrench aria-hidden="true" className="h-6 w-6" />
          <span className="text-lg">ManosYa</span>
        </Link>

        {/* Navegación central */}
        <nav aria-label="Navegación principal">
          <ul className="flex items-center gap-1" role="list">
            {NAV_ITEMS.map(({ href, label, icon: Icon, activePattern }) => {
              const isActive = activePattern.test(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2",
                      "text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA derecha — placeholder para auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className={cn(
              "min-h-[44px] rounded-lg px-4 py-2",
              "text-sm font-medium text-muted-foreground",
              "hover:bg-muted hover:text-foreground",
              "transition-colors",
            )}
          >
            Ingresar
          </Link>
          <Link
            href="/auth/register"
            className={cn(
              "min-h-[44px] rounded-lg bg-brand-600 px-4 py-2",
              "text-sm font-medium text-white",
              "hover:bg-brand-700",
              "transition-colors",
            )}
          >
            Registrarse
          </Link>
        </div>
      </div>
    </header>
  );
}
