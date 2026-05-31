import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getBuscarHref, type BuscarSearchInput } from "./search-params";

export function PaginationControls({
  currentPage,
  hasMore,
  input,
}: {
  currentPage: number;
  hasMore: boolean;
  input: BuscarSearchInput;
}) {
  if (currentPage <= 1 && !hasMore) return null;

  return (
    <nav aria-label="Paginacion" className="mt-5 flex items-center justify-between gap-3">
      {currentPage > 1 ? (
        <Link
          className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground"
          href={getBuscarHref(input, { page: currentPage - 1 })}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link
          className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          href={getBuscarHref(input, { page: currentPage + 1 })}
        >
          Siguiente
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
