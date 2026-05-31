function SkeletonCard() {
  return (
    <div className="provider-card">
      <div className="flex gap-3">
        <div className="skeleton h-14 w-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <div className="skeleton h-4 w-36 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
            <div className="skeleton h-6 w-20 rounded-md" />
          </div>
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
          <div className="flex gap-3">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuscarLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-4 md:px-6 md:py-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur md:top-14 md:mx-0 md:rounded-b-lg md:border-x md:px-5">
        <div className="space-y-2">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-8 w-full max-w-md rounded" />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 md:hidden">
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 w-12 rounded-lg" />
        </div>
        <div className="mt-3 md:hidden">
          <div className="skeleton h-11 rounded-lg" />
        </div>
        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-4 xl:grid-cols-[minmax(220px,1fr)_150px_150px_130px_170px_150px_auto]">
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-8 w-32 rounded-md" />
        <div className="skeleton h-8 w-24 rounded-md" />
      </div>
      <div className="mt-5 grid gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
