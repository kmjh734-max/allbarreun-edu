import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VocabSetPrintView } from "@/components/vocab/VocabSetPrintView";
import { loadVocabSetPrintData } from "@/lib/vocab/load-vocab-set-print";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ setId: string }>;
}

export default async function AdminVocabSetPrintPage({ params }: PageProps) {
  const { setId } = await params;
  const supabase = await createClient();
  const loaded = await loadVocabSetPrintData(supabase, setId);
  if (!loaded) notFound();

  const backHref = `/admin/vocab/set/${setId}`;

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">인쇄 미리보기 준비 중…</div>
      }
    >
      <VocabSetPrintView
        sections={[
          {
            setId: loaded.set.id,
            title: loaded.set.title,
            description: loaded.set.description,
            items: loaded.items,
          },
        ]}
        backHref={backHref}
      />
    </Suspense>
  );
}
