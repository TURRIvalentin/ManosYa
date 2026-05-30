"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { ClipboardList, Home, MessageCircle, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, activePattern: /^\/$/ },
  { href: "/buscar", label: "Buscar", icon: Search, activePattern: /^\/buscar/ },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, activePattern: /^\/pedidos/ },
  { href: "/mensajes", label: "Mensajes", icon: MessageCircle, activePattern: /^\/mensajes/ },
] as const;

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const perfilHref = user ? "/perfil" : "/login";
  const isPerfilActive = /^\/perfil/.test(pathname);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        "pb-safe",
        "md:hidden",
      )}
    >
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activePattern }) => {
          const isActive = activePattern.test(pathname);
          return (
            <li className="flex flex-1" key={href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1",
                  "text-xs font-medium transition-colors",
                  isActive
                    ? "text-brand-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={href}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("h-6 w-6 transition-transform", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}

        {/* Perfil — avatar con iniciales si hay sesión, ícono genérico si no */}
        <li className="flex flex-1">
          <Link
            aria-current={isPerfilActive ? "page" : undefined}
            aria-label="Mi Perfil"
            className={cn(
              "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1",
              "text-xs font-medium transition-colors",
              isPerfilActive
                ? "text-brand-600"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={perfilHref}
          >
            {user ? (
              <AvatarPrimitive.Root
                className={cn(
                  "h-6 w-6 overflow-hidden rounded-full transition-transform",
                  isPerfilActive && "scale-110",
                )}
              >
                <AvatarPrimitive.Image
                  alt={user.name ?? ""}
                  className="h-full w-full object-cover"
                  src={user.image ?? ""}
                />
                <AvatarPrimitive.Fallback
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-full text-[8px] font-bold",
                    isPerfilActive ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {getInitials(user.name)}
                </AvatarPrimitive.Fallback>
              </AvatarPrimitive.Root>
            ) : (
              <User
                aria-hidden="true"
                className={cn("h-6 w-6 transition-transform", isPerfilActive && "scale-110")}
                strokeWidth={isPerfilActive ? 2.5 : 2}
              />
            )}
            <span className="leading-none">Perfil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
