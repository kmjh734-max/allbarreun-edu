import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import {
  canStartVocabTest,
} from "@/lib/vocab/generate-test-questions";
import type { VocabTestType } from "@/lib/vocab/test-types";
import { vocabTestTypeLabel } from "@/lib/vocab/test-types";

const TEST_TYPES: VocabTestType[] = [
  "meaning_choice",
  "word_choice",
  "spelling",
];

interface VocabStudentSetHubProps {
  setId: string;
  setTitle: string;
  itemCount: number;
}

export function VocabStudentSetHub({
  setId,
  setTitle,
  itemCount,
}: VocabStudentSetHubProps) {
  const canTest = canStartVocabTest(itemCount);

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">{setTitle}</h2>
      <p className="mt-1 text-sm text-slate-600">
        카드 학습 또는 테스트를 선택하세요. (단어 {itemCount}개)
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={`/student/vocab/${setId}/study`} size="sm">
          카드 학습
        </ButtonLink>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="text-sm font-semibold text-slate-800">테스트</p>
        {!canTest ? (
          <p className="mt-2 text-sm text-slate-500">
            테스트는 단어가 2개 이상일 때 가능합니다.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {TEST_TYPES.map((type) => (
              <Link
                key={type}
                href={`/student/vocab/${setId}/test?type=${type}`}
                className="flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50/60 px-4 py-3 text-center text-sm font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-100"
              >
                {vocabTestTypeLabel(type)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4">
        <Link
          href="/student/vocab"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장 목록
        </Link>
      </p>
    </div>
  );
}
