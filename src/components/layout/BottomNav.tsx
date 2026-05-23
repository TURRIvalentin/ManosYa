"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    activePattern: /^\/$/,
  },
  {
    href: "/buscar",
    label: "Buscar",
    icon: Search,
    activePattern: /^\/buscar/,
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    activePattern: /^\/pedidos/,
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    icon: MessageCircle,
    activePattern: /^\/mensajes/,
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: User,
    activePattern: /^\/perfil/,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    // Solo visible en mobile (< md). Safe area inset para notch/Dynamic Island.
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        // Safe area: el padding-bottom se suma al alto declarado
        "pb-safe",
        // Solo mostrar en mobile
        "md:hidden",
      )}
    >
      <ul className="flex h-16 items-stretch" role="list">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activePattern }) => {
          const isActive = activePattern.test(pathname);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className={cn(
                  // tap target mínimo 44px (Apple HIG)
                  "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1",
                  "text-xs font-medium transition-colors",
                  isActive
                    ? "text-brand-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-6 w-6 transition-transform",
                    isActive && "scale-110",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
