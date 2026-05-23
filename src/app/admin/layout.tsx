// Panel de administración — desktop-first (admins usan PC)
// TODO Fase 7: sidebar de navegación, proteger con middleware role=ADMIN

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar placeholder */}
      <aside className="hidden w-64 border-r border-border bg-muted/30 lg:block">
        <div className="p-4 font-semibold text-muted-foreground">
          ManosYa Admin
        </div>
      </aside>
      <main id="main-content" className="flex-1 p-6" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
