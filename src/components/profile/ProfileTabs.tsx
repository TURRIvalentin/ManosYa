"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProfileTabsProps {
  hasProviderProfile: boolean;
}

const BASE_TABS = [
  { href: "/perfil", label: "Resumen", exact: true },
  { href: "/perfil/datos", label: "Mis datos", exact: false },
] as const;

const PROVIDER_TABS = [
  { href: "/perfil/servicios", label: "Servicios", exact: false },
  { href: "/perfil/zonas", label: "Zonas", exact: false },
  { href: "/perfil/documentos", label: "Documentos", exact: false },
] as const;

export function ProfileTabs({ hasProviderProfile }: ProfileTabsProps) {
  const pathname = usePathname();

  const tabs = [
    ...BASE_TABS,
    ...(hasProviderProfile ? PROVIDER_TABS : []),
  ];

  return (
    <nav aria-label="Secciones del perfil">
      <ul className="-mb-px flex gap-0 overflow-x-auto border-b border-border">
        {tabs.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[44px] items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                )}
                href={href}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
