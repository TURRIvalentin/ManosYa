import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ManosYa — Servicios profesionales a domicilio en CABA y GBA",
};

// Placeholder — Fase 1 implementa el contenido real
export default function HomePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-foreground md:text-4xl">
        ManosYa
      </h1>
      <p className="mt-2 text-muted-foreground">
        Marketplace de servicios — CABA y GBA
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        🚧 En construcción
      </p>
    </div>
  );
}
