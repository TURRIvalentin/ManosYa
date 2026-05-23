import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Página no encontrada
      </h1>
      <p className="mt-2 text-muted-foreground">
        La página que buscás no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-6 min-h-[44px] rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
