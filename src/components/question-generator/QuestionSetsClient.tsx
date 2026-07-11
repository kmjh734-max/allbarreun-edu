"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

type SetRow = {
  id: string;
  title: string;
  description: string | null;
  items: Array<{ questionId: string; orderIndex: number }>;
  updated_at: string;
};

export function QuestionSetsClient({ basePath }: { basePath: string }) {
  const [sets, setSets] = useState<SetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/question-generator/sets");
    const data = await res.json();
    if (!data.ok) setError(data.message);
    else setSets(data.sets ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function move(set: SetRow, index: number, dir: -1 | 1) {
    const items = [...(set.items ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const tmp = items[index]!;
    items[index] = items[j]!;
    items[j] = tmp;
    const next = items.map((it, orderIndex) => ({
      questionId: it.questionId,
      orderIndex,
    }));
    await fetch("/api/question-generator/sets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: set.id, items: next }),
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="문제 세트"
        description="승인된 문제로 구성한 세트를 관리합니다. 학생 배정·PDF는 추후 연동합니다."
        action={
          <Link
            href={`${basePath}/approved`}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            승인된 문제에서 만들기
          </Link>
        }
      />
      {error && <Alert variant="error">{error}</Alert>}
      <div className="space-y-4">
        {sets.map((s) => {
          const items = [...(s.items ?? [])].sort(
            (a, b) => a.orderIndex - b.orderIndex
          );
          return (
            <article
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <h2 className="font-semibold text-slate-900">{s.title}</h2>
              {s.description && (
                <p className="mt-1 text-sm text-slate-600">{s.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {items.length}문항 ·{" "}
                {new Date(s.updated_at).toLocaleString("ko-KR")}
              </p>
              <ul className="mt-3 space-y-1">
                {items.map((it, idx) => (
                  <li
                    key={`${it.questionId}-${idx}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-6 text-slate-400">{idx + 1}.</span>
                    <Link
                      href={`${basePath}/questions/${it.questionId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {it.questionId.slice(0, 8)}…
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void move(s, idx, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void move(s, idx, 1)}
                    >
                      ↓
                    </Button>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
        {sets.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            저장된 세트가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
