"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { STAGE4_PASS_SCORE } from "@/lib/vocab/build-stage3-questions";
import {
  emptyExamGuestProgress,
  loadExamGuestProgress,
  type ExamGuestProgress,
} from "@/lib/vocab/exam-guest-progress";

function statusLabel(
  locked: boolean,
  done: boolean,
  pass?: boolean,
  fail?: boolean
) {
  if (locked) return { text: "잠김", className: "bg-slate-100 text-slate-500" };
  if (pass) return { text: "합격", className: "bg-emerald-100 text-emerald-900" };
  if (fail) return { text: "불합격", className: "bg-rose-50 text-rose-800" };
  if (done) return { text: "완료", className: "bg-emerald-50 text-emerald-800" };
  return { text: "미완료", className: "bg-amber-50 text-amber-800" };
}

export function ExamVocabGuestHub({
  setId,
  title,
  itemCount,
}: {
  setId: string;
  title: string;
  itemCount: number;
}) {
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<ExamGuestProgress>(
    emptyExamGuestProgress
  );
  const scoreParam = searchParams.get("score");
  const passedParam = searchParams.get("passed");

  useEffect(() => {
    setProgress(loadExamGuestProgress(setId));
  }, [setId, scoreParam]);

  const s1 = statusLabel(false, progress.stage1Done);
  const s2 = statusLabel(!progress.stage1Done, progress.stage2Done);
  const s4Locked = !progress.stage2Done;
  const s4Pass = progress.stage4Passed;
  const s4Fail = progress.stage4Attempts > 0 && !progress.stage4Passed;
  const s4 = statusLabel(s4Locked, false, s4Pass, s4Fail);

  const rows = [
    {
      step: "1",
      title: "뜻 익히기",
      desc: "단어를 보고 뜻을 익힙니다",
      href: `/exam-vocab/${setId}/stage1`,
      locked: false,
      status: s1,
      button: progress.stage1Done ? "다시 보기" : "시작하기",
    },
    {
      step: "2",
      title: "스펠링 학습",
      desc: "한글뜻만 보고 영어 스펠링 입력",
      href: `/exam-vocab/${setId}/stage2`,
      locked: !progress.stage1Done,
      status: s2,
      button: progress.stage2Done ? "다시 하기" : "시작하기",
    },
    {
      step: "3",
      title: "종합테스트",
      desc: `뜻·스펠링 혼합 · ${STAGE4_PASS_SCORE}점 이상 합격`,
      href: `/exam-vocab/${setId}/stage4`,
      locked: s4Locked,
      status: s4,
      button: progress.stage4Attempts > 0 ? "다시 도전하기" : "시작하기",
    },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-8">
      <p className="text-xs font-semibold text-brand-700">보기 단어 학습</p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        로그인 없이 이용 · 진행은 이 기기에 저장됩니다 · {itemCount}단어
      </p>

      {scoreParam != null && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-center text-sm ${
            passedParam === "1"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          테스트 결과 {scoreParam}점
          {passedParam === "1" ? " · 합격" : " · 불합격"}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul>
          {rows.map((r) => (
            <li
              key={r.step}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {r.step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.status.className}`}
              >
                {r.status.text}
              </span>
              {r.locked ? (
                <span className="inline-flex h-9 shrink-0 items-center rounded-lg bg-slate-100 px-3 text-xs text-slate-400">
                  {r.button}
                </span>
              ) : (
                <Link
                  href={r.href}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  {r.button}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {progress.stage4Attempts > 0 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            최근 {progress.stage4Last}점 · 최고 {progress.stage4Best}점 · 응시{" "}
            {progress.stage4Attempts}회
          </p>
        )}
      </div>
    </div>
  );
}
