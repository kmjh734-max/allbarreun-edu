interface ProgressBarProps {
  percent: number;
  label?: string;
  size?: "sm" | "md";
}

export function ProgressBar({
  percent,
  label,
  size = "md",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between gap-2 text-sm">
          <span className="text-slate-600">{label}</span>
          <span className="shrink-0 font-medium text-slate-900">
            {clamped}%
          </span>
        </div>
      )}
      <div
        className={`overflow-hidden rounded-full bg-slate-100 ${barHeight}`}
      >
        <div
          className={`h-full rounded-full bg-brand-600 transition-all duration-300 ${barHeight}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
