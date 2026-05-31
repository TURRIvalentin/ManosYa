import { notFound } from "next/navigation";
import Link from "next/link";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  KeyRound,
  MapPin,
  Wrench,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function QuickLink({ href, icon, label, description }: QuickLinkProps) {
  return (
    <Link
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card p-4",
        "transition-shadow hover:shadow-sm",
      )}
      href={href}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export default async function PerfilPage() {
  const user = await requireVerifiedEmail();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      lastLoginAt: true,
      clientProfile: { select: { id: true } },
      providerProfile: {
        select: {
          id: true,
          cuil: true,
          _count: {
            select: {
              zones: true,
              services: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });

  if (!dbUser) notFound();

  const hasProviderProfile = !!dbUser.providerProfile;
  const providerReady =
    hasProviderProfile &&
    !!dbUser.providerProfile?.cuil &&
    (dbUser.providerProfile?._count.zones ?? 0) >= 1 &&
    (dbUser.providerProfile?._count.services ?? 0) >= 1;

  // Link al primer paso de perfil de prestador que le falta completar
  const providerNextStep = !dbUser.providerProfile?.cuil
    ? "/perfil/datos"
    : (dbUser.providerProfile?._count.zones ?? 0) === 0
    ? "/perfil/zonas"
    : "/perfil/servicios";

  // "mayo 2026" — solo mes y año
  const memberSince = formatDate(dbUser.createdAt, { month: "long", year: "numeric" });
  const lastLoginFormatted = dbUser.lastLoginAt
    ? formatDate(dbUser.lastLoginAt, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Avatar + info ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <AvatarPrimitive.Root className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <AvatarPrimitive.Image
            alt={dbUser.name ?? ""}
            className="h-full w-full object-cover"
            src={dbUser.image ?? ""}
          />
          <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-brand-600 text-xl font-semibold text-white">
            {getInitials(dbUser.name)}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            {dbUser.name ?? "Sin nombre"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{dbUser.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Miembro desde {memberSince}
            {lastLoginFormatted && (
              <> · Último acceso {lastLoginFormatted}</>
            )}
          </p>
        </div>
      </div>

      {/* ── Banner prestador incompleto ────────────────────────────────────── */}
      {hasProviderProfile && !providerReady && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Completá tu perfil de prestador
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Necesitás CUIL, al menos una zona y un servicio activo para aparecer en
              las búsquedas.
            </p>
            <Link
              className="mt-2 inline-flex text-sm font-medium text-amber-900 underline-offset-4 hover:underline"
              href={providerNextStep}
            >
              Completar ahora →
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          description="Nombre, teléfono y contraseña"
          href="/perfil/datos"
          icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
          label="Mis datos"
        />

        {hasProviderProfile && (
          <>
            <QuickLink
              description="Agregá, editá o desactivá servicios"
              href="/perfil/servicios"
              icon={<Wrench className="h-5 w-5" aria-hidden="true" />}
              label="Servicios"
            />
            <QuickLink
              description="Barrios y partidos donde trabajás"
              href="/perfil/zonas"
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              label="Zonas"
            />
            <QuickLink
              description="DNI y matrícula para verificación"
              href="/perfil/documentos"
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              label="Documentos"
            />
          </>
        )}
      </div>
    </div>
  );
}
