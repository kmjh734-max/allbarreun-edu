"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitVocabTest } from "@/app/student/vocab/actions";
import type { SerializedTestQuestion } from "@/lib/vocab/generate-test-questions";
import type { VocabTestType } from "@/lib/vocab/test-types";
import { vocabTestTypeLabel } from "@/lib/vocab/test-types";

interface VocabTestRunnerProps {
  setId: string;
  setTitle: string;
  testType: VocabTestType;
  questions: SerializedTestQuestion[];
}

export function VocabTestRunner({
  setId,
  setTitle,
  testType,
  questions,
}: VocabTestRunnerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const current = questions[index];
  const isLast = index >= total - 1;
  const currentAnswer = current ? (answers[current.itemId] ?? "") : "";

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => (answers[q.itemId] ?? "").trim().length > 0)
        .length,
    [answers, questions]
  );

  function setAnswer(value: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.itemId]: value }));
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function goNext() {
    if (index < total - 1) setIndex((i) => i + 1);
  }

  function handleSubmit() {
    const unanswered = total - answeredCount;
    const msg =
      unanswered > 0
        ? `답하지 않은 문제 ${unanswered}개는 오답 처리됩니다. 제출할까요?`
        : "테스트를 제출할까요?";
    if (!confirm(msg)) return;

    startTransition(async () => {
      setError(null);
      const payload = questions.map((q) => ({
        itemId: q.itemId,
        studentAnswer: answers[q.itemId] ?? "",
      }));
      const itemOrder = questions.map((q) => q.itemId);
      const result = await submitVocabTest(
        setId,
        testType,
        payload,
        itemOrder
      );
      if (!result.ok || !result.attemptId) {
        setError(result.message);
        return;
      }
      router.push(
        `/student/vocab/${setId}/test/result?attemptId=${result.attemptId}`
      );
    });
  }

  if (!current) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-2 sm:px-0">
      <div>
        <Link
          href={`/student/vocab/${setId}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장으로
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
          {setTitle}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {vocabTestTypeLabel(testType)} · {index + 1} / {total}
        </p>
      </div>

      <div className="min-h-[min(70vh,520px)] rounded-3xl border-2 border-brand-200 bg-white p-6 shadow-[0_16px_48px_rgb(15_23_42/0.1)] sm:p-10">
        {testType === "meaning_choice" && (
          <>
            <p className="text-sm font-semibold text-brand-600">영어 단어</p>
            <p className="mt-4 text-center text-4xl font-bold text-slate-900 sm:text-5xl">
              {current.questionText}
            </p>
          </>
        )}

        {testType === "word_choice" && (
          <>
            <p className="text-sm font-semibold text-brand-600">뜻</p>
            <p className="mt-4 text-center text-3xl font-bold text-slate-900 sm:text-4xl">
              {current.questionText}
            </p>
          </>
        )}

        {testType === "spelling" && (
          <>
            <p className="text-sm font-semibold text-brand-600">뜻</p>
            <p className="mt-4 text-center text-3xl font-bold text-slate-900 sm:text-4xl">
              {current.questionText}
            </p>
            {current.promptExtra && (
              <p className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-lg text-slate-700">
                {current.promptExtra}
              </p>
            )}
          </>
        )}

        {current.choices && current.choices.length > 0 ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {current.choices.map((choice, i) => {
              const selected = currentAnswer === choice;
              return (
                <li key={`${choice}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setAnswer(choice)}
                    className={`flex min-h-[3.5rem] w-full items-center justify-center rounded-xl border-2 px-4 py-4 text-center text-base font-medium transition ${
                      selected
                        ? "border-violet-500 bg-violet-50 text-violet-900"
                        : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"
                    }`}
                  >
                    {choice}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-8">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              영어 단어 입력
            </label>
            <input
              className="ui-input min-h-[3.5rem] text-center text-xl"
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="영어 단어"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={index === 0 || pending}
          onClick={goPrev}
        >
          이전 문제
        </Button>
        <span className="text-sm text-slate-500">
          응답 {answeredCount} / {total}
        </span>
        {isLast ? (
          <Button type="button" disabled={pending} onClick={handleSubmit}>
            {pending ? "제출 중..." : "제출하기"}
          </Button>
        ) : (
          <Button type="button" variant="ghost" disabled={pending} onClick={goNext}>
            다음 문제
          </Button>
        )}
      </div>
    </div>
  );
}
