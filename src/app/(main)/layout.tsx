import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";

type MainLayoutProps = {
  children: React.ReactNode;
};

// Layout compartido por todas las páginas de la app principal
// (Inicio, Buscar, Pedidos, Mensajes, Perfil, Prestadores)
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* TopBar — visible solo en desktop (md+), oculta en mobile */}
      <TopBar />

      {/* Contenido principal
          - En mobile: sin padding-top (no hay topbar), con padding-bottom para la bottom nav
          - En desktop (md+): padding-top para dejar espacio al topbar fijo */}
      <main
        id="main-content"
        className="flex-1 pt-0 md:pt-14"
        // skip link target para accesibilidad
        tabIndex={-1}
      >
        {/* Wrapper con padding bottom para que el contenido no quede tapado
            por la bottom nav en mobile */}
        <div className="main-content">{children}</div>
      </main>

      {/* BottomNav — visible solo en mobile (< md), oculta en desktop */}
      <BottomNav />
    </div>
  );
}
