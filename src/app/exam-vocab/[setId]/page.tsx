import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExamVocabGuestHub } from "@/components/vocab/ExamVocabGuestHub";
import { dedupeVocabItemRows } from "@/lib/question-generator/exam-vocab";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ setId: string }>;
}

/** 시험지 QR — 로그인 없이 보기 단어 학습 허브 */
export default async function ExamVocabHubPage({ params }: PageProps) {
  const { setId } = await params;
  const admin = createAdminClient();
  const { data: set } = await admin
    .from("vocab_sets")
    .select("id, title, exam_compact")
    .eq("id", setId)
    .maybeSingle();

  if (!set || !set.exam_compact) notFound();

  const { data: items } = await admin
    .from("vocab_items")
    .select("id, word, meaning, order_index")
    .eq("set_id", setId)
    .order("order_index");

  const uniqueCount = dedupeVocabItemRows(items ?? []).length;

  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-sm text-slate-500">불러오는 중…</p>
      }
    >
      <ExamVocabGuestHub
        setId={set.id}
        title={set.title || "보기 단어"}
        itemCount={uniqueCount}
      />
    </Suspense>
  );
}
