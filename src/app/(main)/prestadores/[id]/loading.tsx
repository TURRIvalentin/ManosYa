function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export default function ProviderLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-5 md:px-6 md:py-8">
      <section className="rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <SkeletonBlock className="h-20 w-20 shrink-0 md:h-24 md:w-24" />
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonBlock className="h-7 w-48" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-20" />
                <SkeletonBlock className="h-6 w-28" />
              </div>
            </div>
          </div>
          <SkeletonBlock className="h-11 w-full md:w-44" />
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-4/5" />
        </div>
      </section>

      <section className="mt-5 space-y-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-7 w-48" />
        <div className="rounded-lg border border-border p-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-5 w-64" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
        </div>
        <div className="rounded-lg border border-border p-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-5 w-56" />
          <SkeletonBlock className="mt-3 h-4 w-5/6" />
        </div>
      </section>
    </div>
  );
}
