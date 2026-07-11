import Link from "next/link";

interface VocabSetPageHeaderProps {
  title: string;
  itemCount: number;
  backHref: string;
  backLabel?: string;
  printHref?: string;
  assignLauncher: React.ReactNode;
}

export function VocabSetPageHeader({
  title,
  itemCount,
  backHref,
  backLabel = "← 폴더로 돌아가기",
  printHref,
  assignLauncher,
}: VocabSetPageHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 sm:px-6">
        <Link
          href={backHref}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {backLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              단어
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{itemCount} 카드</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {printHref ? (
              <Link
                href={printHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                인쇄 / PDF
              </Link>
            ) : null}
            {assignLauncher}
          </div>
        </div>
      </div>
    </header>
  );
}
