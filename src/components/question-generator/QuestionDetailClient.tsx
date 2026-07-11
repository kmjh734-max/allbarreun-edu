"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export function QuestionDetailClient({
  questionId,
  basePath,
}: {
  questionId: string;
  basePath: string;
}) {
  const [q, setQ] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/question-generator/questions/${questionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setError(d.message);
        else setQ(d.question);
      })
      .catch(() => setError("불러오기 실패"));
  }, [questionId]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!q) return <p className="text-sm text-slate-500">불러오는 중…</p>;

  return (
    <div>
      <PageHeader
        title="문제 상세"
        action={
          <Link href={`${basePath}/generations`} className="text-sm text-brand-700">
            ← 목록
          </Link>
        }
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <pre className="whitespace-pre-wrap text-xs text-slate-700">
          {JSON.stringify(q, null, 2)}
        </pre>
        <div className="mt-4">
          <Button
            type="button"
            onClick={() =>
              void fetch(`/api/question-generator/questions/${questionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" }),
              }).then(() => window.location.reload())
            }
          >
            승인
          </Button>
        </div>
      </div>
    </div>
  );
}
