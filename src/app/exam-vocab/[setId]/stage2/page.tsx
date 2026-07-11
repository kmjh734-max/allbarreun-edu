"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VocabStage2Spelling } from "@/components/vocab/VocabStage2Spelling";
import { loadExamGuestProgress } from "@/lib/vocab/exam-guest-progress";
import type { VocabItem } from "@/types/database";

export default function ExamVocabStage2Page() {
  const params = useParams();
  const router = useRouter();
  const setId = String(params.setId ?? "");
  const hub = `/exam-vocab/${setId}`;
  const [title, setTitle] = useState("보기 단어");
  const [items, setItems] = useState<VocabItem[] | null>(null);

  useEffect(() => {
    if (!setId) return;
    const progress = loadExamGuestProgress(setId);
    if (!progress.stage1Done) {
      router.replace(hub);
      return;
    }
    void fetch(`/api/exam-vocab/${setId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          router.replace(hub);
          return;
        }
        setTitle(data.set?.title || "보기 단어");
        setItems(data.items ?? []);
      })
      .catch(() => router.replace(hub));
  }, [setId, hub, router]);

  if (!items) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">불러오는 중…</p>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <VocabStage2Spelling
        setId={setId}
        setTitle={title}
        items={items}
        hubHref={hub}
        guestMode
      />
    </div>
  );
}
