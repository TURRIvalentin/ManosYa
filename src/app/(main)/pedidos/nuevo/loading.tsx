export default function NewRequestLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-5 md:px-6 md:py-8">
      <div className="skeleton h-5 w-36 rounded" />
      <section className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="space-y-3">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-8 w-56 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
        </div>
        <div className="mt-5 grid gap-4">
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-20 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
        </div>
      </section>
    </div>
  );
}
