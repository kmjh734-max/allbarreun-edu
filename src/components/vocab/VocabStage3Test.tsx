"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitStage4 } from "@/app/student/vocab/actions";
import type { Stage3Question } from "@/lib/vocab/build-stage3-questions";
import { STAGE4_PASS_SCORE } from "@/lib/vocab/build-stage3-questions";
import { gradeSpellingAnswer } from "@/lib/vocab/grade-spelling";
import {
  loadExamGuestProgress,
  saveExamGuestProgress,
} from "@/lib/vocab/exam-guest-progress";

function answerKey(q: Stage3Question): string {
  return `${q.itemId}:${q.questionType}`;
}

function gradeMeaning(student: string, correct: string): boolean {
  const a = student.trim().toLowerCase().replace(/\s+/g, "");
  const b = correct.trim().toLowerCase().replace(/\s+/g, "");
  if (!a) return false;
  return a === b || a.includes(b) || b.includes(a);
}

interface VocabStage3TestProps {
  setId: string;
  setTitle: string;
  questions: Stage3Question[];
  stageNumber?: number;
  hubHref?: string;
  guestMode?: boolean;
}

export function VocabStage3Test({
  setId,
  setTitle,
  questions,
  stageNumber = 4,
  hubHref,
  guestMode = false,
}: VocabStage3TestProps) {
  const router = useRouter();
  const hub = hubHref ?? `/student/vocab/${setId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const current = questions[index];
  const isLast = index >= questions.length - 1;
  const currentKey = current ? answerKey(current) : "";

  useEffect(() => {
    if (!current || submitting) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [index, current, submitting]);

  const goNext = useCallback(() => {
    setMessage(null);
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  function finishGuest() {
    let correct = 0;
    for (const q of questions) {
      const ans = (answers[answerKey(q)] ?? "").trim();
      const ok =
        q.questionType === "spelling"
          ? gradeSpellingAnswer(q.correctAnswer, ans)
          : gradeMeaning(ans, q.correctAnswer);
      if (ok) correct += 1;
    }
    const score =
      questions.length > 0
        ? Math.round((correct / questions.length) * 100)
        : 0;
    const passed = score >= STAGE4_PASS_SCORE;
    const prev = loadExamGuestProgress(setId);
    saveExamGuestProgress(setId, {
      ...prev,
      stage4Last: score,
      stage4Best: Math.max(prev.stage4Best, score),
      stage4Passed: prev.stage4Passed || passed,
      stage4Attempts: prev.stage4Attempts + 1,
    });
    setSubmitting(false);
    router.push(
      `${hub}?score=${score}&passed=${passed ? "1" : "0"}`
    );
  }

  function submitAll() {
    if (submitting) return;

    const unanswered = questions.filter(
      (q) => !(answers[answerKey(q)] ?? "").trim()
    ).length;
    if (unanswered > 0) {
      const msg = `미응답 ${unanswered}문항은 오답 처리됩니다. 제출할까요?`;
      if (!confirm(msg)) return;
    }

    setSubmitting(true);
    setMessage(null);

    if (guestMode) {
      finishGuest();
      return;
    }

    const payload = questions.map((q) => ({
      itemId: q.itemId,
      studentAnswer: answers[answerKey(q)] ?? "",
      questionType: q.questionType,
    }));

    void submitStage4(setId, payload).then((result) => {
      setSubmitting(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.attemptId) {
        router.push(
          `/student/vocab/${setId}/stage4/result?attemptId=${result.attemptId}`
        );
      } else {
        router.push(hub);
        router.refresh();
      }
    });
  }

  function handleEnter() {
    if (!current || submitting) return;
    const value = (answers[currentKey] ?? "").trim();
    if (!value) {
      setMessage("답을 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    setMessage(null);
    if (isLast) {
      submitAll();
    } else {
      goNext();
    }
  }

  if (questions.length === 0) {
    return <p className="text-center text-slate-600">단어가 없습니다.</p>;
  }

  const isMeaning = current?.questionType === "meaning";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-2">
      <div>
        <Link href={hub} className="text-sm text-brand-600 hover:underline">
          ← 단어장으로
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {setTitle} · {stageNumber}단계 종합테스트
        </h1>
        <p className="text-sm text-slate-600">
          한글뜻 50% + 영어 스펠링 50% · {STAGE4_PASS_SCORE}점 이상 합격 · Enter로
          다음/제출
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {index + 1} / {questions.length}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold text-slate-500">
          {isMeaning ? "뜻 쓰기" : "스펠링"}
        </p>
        <p className="mt-3 text-center text-2xl font-bold text-slate-900">
          {current.questionText}
        </p>
        {current.promptExtra && (
          <p className="mt-2 text-center text-sm text-slate-500">
            {current.promptExtra}
          </p>
        )}
        <input
          ref={inputRef}
          className="ui-input mt-6 min-h-[3.5rem] text-center text-xl"
          value={answers[currentKey] ?? ""}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [currentKey]: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleEnter();
            }
          }}
          disabled={submitting}
        />
        {message && (
          <p className="mt-3 text-center text-sm text-rose-600">{message}</p>
        )}
        <div className="mt-6 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={index === 0 || submitting}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            이전
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={submitting}
            onClick={handleEnter}
          >
            {isLast ? (submitting ? "제출 중…" : "제출") : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}
