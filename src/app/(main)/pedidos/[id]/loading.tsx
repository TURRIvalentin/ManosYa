export default function RequestDetailLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-5 md:px-6 md:pb-8 md:pt-8">
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />

      <section className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-4/5 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>

      <div className="mt-5 h-20 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
