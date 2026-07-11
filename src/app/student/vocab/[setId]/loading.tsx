export default function StudentVocabSetLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-7 w-48 rounded bg-slate-200" />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0"
          >
            <div className="h-5 w-14 rounded bg-violet-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-3 w-48 rounded bg-slate-100" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
