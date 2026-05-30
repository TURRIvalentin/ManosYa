"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import {
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  Search,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, activePattern: /^\/$/ },
  { href: "/buscar", label: "Buscar", icon: Search, activePattern: /^\/buscar/ },
  { href: "/pedidos", label: "Mis Pedidos", icon: ClipboardList, activePattern: /^\/pedidos/ },
  { href: "/mensajes", label: "Mensajes", icon: MessageCircle, activePattern: /^\/mensajes/ },
  { href: "/perfil", label: "Mi Perfil", icon: User, activePattern: /^\/perfil/ },
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

export function TopBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50",
        "hidden md:block",
        "border-b border-border bg-background/95 backdrop-blur-sm",
        "pt-safe",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          aria-label="ManosYa — Inicio"
          className="flex items-center gap-2 font-bold text-brand-600"
          href="/"
        >
          <Wrench aria-hidden="true" className="h-6 w-6" />
          <span className="text-lg">ManosYa</span>
        </Link>

        {/* Navegación central */}
        <nav aria-label="Navegación principal">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, activePattern }) => {
              const isActive = activePattern.test(pathname);
              return (
                <li key={href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2",
                      "text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    href={href}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA derecha — varía según sesión */}
        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5",
                    "text-sm font-medium text-foreground transition-colors",
                    "hover:bg-muted",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                  )}
                >
                  <AvatarPrimitive.Root className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <AvatarPrimitive.Image
                      alt={user.name ?? ""}
                      className="h-full w-full object-cover"
                      src={user.image ?? ""}
                    />
                    <AvatarPrimitive.Fallback
                      className="flex h-full w-full items-center justify-center bg-brand-600 text-xs font-semibold text-white"
                    >
                      {getInitials(user.name)}
                    </AvatarPrimitive.Fallback>
                  </AvatarPrimitive.Root>
                  <span className="max-w-[120px] truncate">
                    {user.name?.split(" ")[0] ?? user.email}
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className={cn(
                    "z-50 min-w-[180px] rounded-xl border border-border bg-background p-1 shadow-md",
                    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                  )}
                  sideOffset={8}
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted"
                      href="/perfil"
                    >
                      <User aria-hidden="true" className="h-4 w-4" />
                      Mi perfil
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 h-px bg-border" />

                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                    onSelect={() => void signOut({ callbackUrl: "/" })}
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Salir
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <>
              <Link
                className={cn(
                  "min-h-[44px] rounded-lg px-4 py-2",
                  "text-sm font-medium text-muted-foreground",
                  "hover:bg-muted hover:text-foreground",
                  "transition-colors",
                )}
                href="/login"
              >
                Ingresar
              </Link>
              <Link
                className={cn(
                  "min-h-[44px] rounded-lg bg-brand-600 px-4 py-2",
                  "text-sm font-medium text-white",
                  "hover:bg-brand-700",
                  "transition-colors",
                )}
                href="/register"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
