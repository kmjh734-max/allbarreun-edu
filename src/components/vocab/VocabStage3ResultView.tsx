"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { STAGE4_PASS_SCORE } from "@/lib/vocab/build-stage3-questions";
import type { VocabFinalTestAnswer, VocabFinalTestAttempt } from "@/types/database";

interface VocabStage3ResultViewProps {
  setId: string;
  setTitle: string;
  attempt: VocabFinalTestAttempt;
  answers: VocabFinalTestAnswer[];
  stageNumber?: number;
  hubHref?: string;
  autoReturnSeconds?: number;
}

function AnswerResultCard({ a }: { a: VocabFinalTestAnswer }) {
  const isMeaning = a.question_type === "meaning";

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isMeaning ? "뜻 문제" : "스펠링 문제"}
      </p>
      <p className="mt-2 font-medium text-slate-900">
        문제: {a.question_text}
      </p>
      <p className="mt-1 text-slate-600">
        내 답: {a.student_answer || "(비어 있음)"}
      </p>
      <p className="text-emerald-700">정답: {a.correct_answer}</p>
      <p
        className={`mt-2 font-medium ${
          a.is_correct ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        결과: {a.is_correct ? "정답" : "오답"}
      </p>
      {isMeaning && a.ai_feedback && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
          AI 피드백: {a.ai_feedback}
        </p>
      )}
    </li>
  );
}

export function VocabStage3ResultView({
  setId,
  setTitle,
  attempt,
  answers,
  stageNumber = 4,
  hubHref,
  autoReturnSeconds = 3,
}: VocabStage3ResultViewProps) {
  const router = useRouter();
  const hub = hubHref ?? `/student/vocab/${setId}`;
  const wrong = answers.filter((a) => !a.is_correct);
  const meaningAnswers = answers.filter((a) => a.question_type === "meaning");

  useEffect(() => {
    if (autoReturnSeconds <= 0) return;
    const t = window.setTimeout(() => {
      router.push(hub);
      router.refresh();
    }, autoReturnSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [autoReturnSeconds, hub, router]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-2">
      <div>
        <h1 className="text-xl font-semibold">{setTitle}</h1>
        <p className="text-sm text-slate-600">
          {stageNumber}단계 종합테스트 결과
        </p>
        {autoReturnSeconds > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            {autoReturnSeconds}초 후 단어장 화면으로 이동합니다…
          </p>
        )}
      </div>

      <div
        className={`rounded-2xl border-2 p-8 text-center ${
          attempt.passed
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50"
        }`}
      >
        <p className="text-4xl font-bold">{attempt.score}점</p>
        <p className="mt-2 text-lg font-semibold">
          {attempt.passed ? "합격" : "불합격"}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          정답 {attempt.correct_count} / {attempt.total_questions}
        </p>
        <p className="mt-4 text-sm">
          {attempt.passed ? (
            <span className="font-medium text-emerald-800">합격입니다.</span>
          ) : (
            <span className="font-medium text-rose-800">
              {STAGE4_PASS_SCORE}점 이상 통과해야 합니다. 다시 도전해보세요.
            </span>
          )}
        </p>
      </div>

      {meaningAnswers.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">뜻 문제 채점 (AI)</h2>
          <ul className="space-y-3">
            {meaningAnswers.map((a) => (
              <AnswerResultCard key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}

      {wrong.filter((a) => a.question_type === "spelling").length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">
            스펠링 오답 (
            {wrong.filter((a) => a.question_type === "spelling").length})
          </h2>
          <ul className="space-y-3">
            {wrong
              .filter((a) => a.question_type === "spelling")
              .map((a) => (
                <AnswerResultCard key={a.id} a={a} />
              ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/student/vocab/${setId}/stage4`}>
          다시 {stageNumber}단계 도전하기
        </ButtonLink>
        <ButtonLink href={hub} variant="secondary">
          단어장으로 돌아가기
        </ButtonLink>
      </div>

      <p className="text-center text-xs text-slate-400">
        {new Date(attempt.submitted_at).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
