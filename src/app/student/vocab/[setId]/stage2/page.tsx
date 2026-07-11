import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabStage2Spelling } from "@/components/vocab/VocabStage2Spelling";
import { loadStudentVocabSetContext } from "@/lib/vocab/load-student-vocab-set";

interface PageProps {
  params: Promise<{ setId: string }>;
}

export default async function StudentVocabStage2Page({ params }: PageProps) {
  const { setId } = await params;
  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);

  const ctx = await loadStudentVocabSetContext(supabase, profile!.id, setId, {
    items: "stage2",
    progress: "hub",
  });
  if (!ctx) notFound();
  if (!ctx.progress.stage1_completed) {
    redirect(`/student/vocab/${setId}`);
  }
  if (ctx.itemCount < 1) redirect(`/student/vocab/${setId}`);

  return (
    <div className="py-6 sm:py-10">
      <VocabStage2Spelling
        setId={setId}
        setTitle={ctx.set.title}
        items={ctx.items}
      />
    </div>
  );
}
