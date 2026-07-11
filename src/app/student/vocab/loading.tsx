export default function StudentVocabLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded bg-slate-200" />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0"
          >
            <div className="h-5 w-12 rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
            <div className="h-9 w-16 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
