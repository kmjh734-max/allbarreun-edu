"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

type Q = {
  id: string;
  category: string;
  question_type: string;
  difficulty: string;
  instruction: string;
  question_text: string;
  status: string;
  validation_score: number | null;
  created_at: string;
};

export function QuestionBankListClient({
  basePath,
  status,
  title,
  description,
}: {
  basePath: string;
  status: string;
  title: string;
  description: string;
}) {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [setTitle, setSetTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/question-generator/questions?status=${encodeURIComponent(status)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setError(d.message);
        else setQuestions(d.questions ?? []);
      })
      .catch(() => setError("목록을 불러오지 못했습니다."));
  }, [status]);

  async function createSet() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) {
      setError("문제를 선택해 주세요.");
      return;
    }
    if (!setTitle.trim()) {
      setError("세트 제목을 입력해 주세요.");
      return;
    }
    const res = await fetch("/api/question-generator/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: setTitle,
        items: ids.map((questionId, orderIndex) => ({
          questionId,
          orderIndex,
        })),
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.message);
      return;
    }
    setMessage("문제 세트가 저장되었습니다.");
    setSelected({});
    setSetTitle("");
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Link href={basePath} className="rounded-lg border px-3 py-2 text-sm">
            ← 생성
          </Link>
        }
      />
      {error && (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {message && (
        <div className="mb-3">
          <Alert variant="success">{message}</Alert>
        </div>
      )}

      {status === "approved" && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <label className="block grow">
            <span className="ui-label">선택 문제로 세트 만들기</span>
            <input
              className="ui-input mt-1"
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              placeholder="세트 제목"
            />
          </label>
          <Button type="button" onClick={() => void createSet()}>
            세트 저장
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {questions.map((q) => (
          <label
            key={q.id}
            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            {status === "approved" && (
              <input
                type="checkbox"
                className="mt-1"
                checked={!!selected[q.id]}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, [q.id]: e.target.checked }))
                }
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{q.question_type}</span>
                <span>{q.difficulty}</span>
                {q.validation_score != null && (
                  <span>검수 {q.validation_score}</span>
                )}
                <span>{new Date(q.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-slate-900">
                {q.instruction || q.question_text}
              </p>
              <Link
                href={`${basePath}/questions/${q.id}`}
                className="mt-1 inline-block text-xs text-brand-700 hover:underline"
              >
                상세 보기
              </Link>
            </div>
          </label>
        ))}
        {questions.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            표시할 문제가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
