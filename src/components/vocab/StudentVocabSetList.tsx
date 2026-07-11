import Link from "next/link";
import type { StudentVocabSetSummary } from "@/types/database";

interface StudentVocabSetListProps {
  summaries: StudentVocabSetSummary[];
}

function stageLine(
  stage1: boolean,
  stage2: boolean,
  stage3: boolean,
  stage4Passed: boolean,
  stage4Last: number
): string {
  const s1 = stage1 ? "1✓" : "1·";
  const s2 = !stage1 ? "2잠김" : stage2 ? "2✓" : "2·";
  const s3 = !stage2 ? "3잠김" : stage3 ? "3✓" : "3·";
  const s4 = !stage3
    ? "4잠김"
    : stage4Passed
      ? "4합격"
      : stage4Last > 0
        ? `4${stage4Last}점`
        : "4·";
  return `${s1} ${s2} ${s3} ${s4}`;
}

export function StudentVocabSetList({ summaries }: StudentVocabSetListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-medium text-slate-700">
          전체 단어장 <span className="text-slate-400">·</span>{" "}
          <span className="text-slate-500">{summaries.length}개</span>
        </p>
        <p className="text-xs text-slate-500">1단계 → 2단계 → 3단계 → 4단계</p>
      </div>

      {summaries.length === 0 ? (
        <p className="px-6 py-12 text-center text-slate-500">
          배정된 단어장이 없습니다.
        </p>
      ) : (
        <ul>
          {summaries.map(
            ({
              set,
              itemCount,
              stage1Completed,
              stage2Completed,
              stage3Completed,
              stage4Passed,
              stage4LastScore,
              stage4BestScore,
            }) => (
              <li
                key={set.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 hover:bg-slate-50/80"
              >
                <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  단어
                </span>
                <div className="min-w-0 flex-1">
                  {itemCount > 0 ? (
                    <Link
                      href={`/student/vocab/${set.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-600 hover:underline"
                    >
                      {set.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-500">
                      {set.title}
                    </span>
                  )}
                  <p className="mt-0.5 text-sm text-slate-500">
                    {itemCount} 카드 ·{" "}
                    {stageLine(
                      stage1Completed,
                      stage2Completed,
                      stage3Completed,
                      stage4Passed,
                      stage4LastScore
                    )}
                    {stage4BestScore > 0 && ` · 최고 ${stage4BestScore}점`}
                  </p>
                </div>
                <div className="shrink-0">
                  {itemCount > 0 ? (
                    <Link
                      href={`/student/vocab/${set.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                      학습
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">단어 없음</span>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
