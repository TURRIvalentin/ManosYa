import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Error de acceso" };

interface Props {
  searchParams: Promise<{ code?: string; provider?: string }>;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string; cta?: string; ctaHref?: string }> = {
  OAuthAccountConflict: {
    title: "Esta cuenta usa contraseña",
    body: "Este email ya tiene una cuenta creada con email y contraseña. Ingresá con tus datos de siempre. Si querés vincular Google, podés hacerlo después desde Perfil > Seguridad.",
    cta: "Ingresar con contraseña",
    ctaHref: "/login",
  },
  OAuthEmailNotVerified: {
    title: "Email no verificado",
    body: "Google indicó que este email no está verificado. No podemos crear una cuenta hasta que lo sea.",
    cta: "Volver al ingreso",
    ctaHref: "/login",
  },
  OAuthSignin: {
    title: "Error al conectar con Google",
    body: "No pudimos conectarnos con Google. Intentá de nuevo o ingresá con email y contraseña.",
    cta: "Intentar de nuevo",
    ctaHref: "/login",
  },
  OAuthCallback: {
    title: "Error en la respuesta de Google",
    body: "Ocurrió un error durante el proceso de autenticación. Esto puede ser temporal — intentá de nuevo.",
    cta: "Intentar de nuevo",
    ctaHref: "/login",
  },
  SessionRequired: {
    title: "Necesitás ingresar",
    body: "Esta página requiere que hayas iniciado sesión.",
    cta: "Ingresar",
    ctaHref: "/login",
  },
};

const DEFAULT_ERROR = {
  title: "Ocurrió un error",
  body: "No pudimos completar el proceso. Si el problema persiste, contactanos.",
  cta: "Volver al inicio",
  ctaHref: "/",
};

export default async function ErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params.code ?? "";
  const { title, body, cta, ctaHref } = ERROR_MESSAGES[code] ?? DEFAULT_ERROR;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-7 w-7 text-destructive"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {process.env.NODE_ENV === "development" && code && (
          <p className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            code: {code}
          </p>
        )}
      </div>

      {cta && ctaHref && (
        <Link
          href={ctaHref}
          className="flex h-12 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          {cta}
        </Link>
      )}

      <Link
        href="/"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
