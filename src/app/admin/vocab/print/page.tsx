import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { VocabSetPrintView } from "@/components/vocab/VocabSetPrintView";
import { loadVocabSetsPrintData } from "@/lib/vocab/load-vocab-set-print";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams: Promise<{ sets?: string; back?: string }>;
}

export default async function AdminVocabBulkPrintPage({
  searchParams,
}: PageProps) {
  const { sets: setsParam, back } = await searchParams;
  const setIds = (setsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (setIds.length === 0) {
    redirect("/admin/vocab/sets");
  }

  const supabase = await createClient();
  const sections = await loadVocabSetsPrintData(supabase, setIds);
  if (sections.length === 0) notFound();

  const backHref = back?.startsWith("/admin/") ? back : "/admin/vocab/sets";

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">인쇄 미리보기 준비 중…</div>
      }
    >
      <VocabSetPrintView
        sections={sections}
        backHref={backHref}
        documentTitle={
          sections.length === 1
            ? sections[0]!.title
            : `${sections.length}개 단어세트`
        }
      />
    </Suspense>
  );
}
