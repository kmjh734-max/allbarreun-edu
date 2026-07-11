import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type {
  TestAnswerDetail,
  TestAttemptDetail,
} from "@/lib/vocab/load-test-attempt";

interface VocabTestResultViewProps {
  setId: string;
  attempt: TestAttemptDetail;
  answers: TestAnswerDetail[];
}

export function VocabTestResultView({
  setId,
  attempt,
  answers,
}: VocabTestResultViewProps) {
  const submittedLabel = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleString("ko-KR")
    : "—";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-2 sm:px-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          테스트 결과
        </h1>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">단어장</dt>
            <dd className="text-lg font-medium">{attempt.set_title}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">테스트 유형</dt>
            <dd className="text-lg font-medium">{attempt.test_type_label}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">점수</dt>
            <dd className="text-3xl font-bold text-brand-700">{attempt.score}점</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">정답</dt>
            <dd className="text-lg font-medium">
              {attempt.correct_count} / {attempt.total_questions}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500">제출일</dt>
            <dd className="text-base">{submittedLabel}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href={`/student/vocab/${setId}`}>
            {attempt.test_type === "final_exam" ? "다시 학습" : "다시 테스트"}
          </ButtonLink>
          <ButtonLink href={`/student/vocab/${setId}`} variant="secondary">
            단어장으로 돌아가기
          </ButtonLink>
          <span
            className="inline-flex h-10 cursor-not-allowed items-center rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-400"
            title="3단계에서 제공 예정"
          >
            오답만 다시 학습 (다음 단계 예정)
          </span>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">문항별 결과</h2>
        <ul className="mt-4 space-y-3">
          {answers.map((a, i) => (
            <li
              key={a.id}
              className={`rounded-xl border-2 p-4 sm:p-5 ${
                a.is_correct
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-red-200 bg-red-50/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-600">
                  {i + 1}번
                </span>
                <span
                  className={`text-sm font-bold ${
                    a.is_correct ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {a.is_correct ? "정답" : "오답"}
                </span>
              </div>
              <p className="mt-2 text-base font-medium text-slate-900">
                {a.question_text ?? "—"}
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">내 답</dt>
                  <dd
                    className={`font-medium ${
                      a.is_correct ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {a.student_answer?.trim() || "(미응답)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">정답</dt>
                  <dd className="font-medium text-slate-800">
                    {a.correct_answer ?? "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center">
        <Link href="/student/vocab" className="text-sm text-brand-600 hover:underline">
          단어장 목록
        </Link>
      </p>
    </div>
  );
}
