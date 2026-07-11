export function VocabStageLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4 px-2">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-6 w-48 rounded bg-slate-200" />
      <div className="h-3 w-full max-w-md rounded bg-slate-100" />
      <div className="h-2 w-full rounded-full bg-slate-100" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mx-auto h-4 w-40 rounded bg-slate-100" />
        <div className="mx-auto mt-6 h-8 w-56 rounded bg-slate-200" />
        <div className="mx-auto mt-8 h-14 w-full max-w-sm rounded-lg bg-slate-100" />
        <div className="mx-auto mt-6 h-10 w-28 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
