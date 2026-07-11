import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabStage3Test } from "@/components/vocab/VocabStage3Test";
import { buildStage3Questions } from "@/lib/vocab/build-stage3-questions";
import { ensureExamCompactStageSkip } from "@/lib/question-generator/exam-vocab";
import { loadStageProgress } from "@/lib/vocab/load-stage-progress";
import { loadStudentVocabSetContext } from "@/lib/vocab/load-student-vocab-set";

interface PageProps {
  params: Promise<{ setId: string }>;
}

export default async function StudentVocabStage4Page({ params }: PageProps) {
  const { setId } = await params;
  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);

  const ctx = await loadStudentVocabSetContext(supabase, profile!.id, setId, {
    items: "stage4",
    progress: "hub",
  });
  if (!ctx) notFound();

  if (ctx.set.exam_compact) {
    await ensureExamCompactStageSkip(profile!.id, setId);
  }

  const progress = await loadStageProgress(supabase, profile!.id, setId, {
    createIfMissing: false,
    fields: "hub",
  });

  const unlocked = ctx.set.exam_compact
    ? progress.stage2_completed
    : progress.stage3_completed;
  if (!unlocked) redirect(`/student/vocab/${setId}`);
  if (ctx.itemCount < 1) redirect(`/student/vocab/${setId}`);

  const questions = buildStage3Questions(ctx.items);

  return (
    <div className="py-6 sm:py-10">
      <VocabStage3Test
        setId={setId}
        setTitle={ctx.set.title}
        questions={questions}
        stageNumber={4}
      />
    </div>
  );
}
