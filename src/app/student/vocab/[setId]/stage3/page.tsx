import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabStage3ExampleBlank } from "@/components/vocab/VocabStage3ExampleBlank";
import { buildExampleBlankQuestions } from "@/lib/vocab/example-blank";
import { loadStudentVocabSetContext } from "@/lib/vocab/load-student-vocab-set";

interface PageProps {
  params: Promise<{ setId: string }>;
}

export default async function StudentVocabStage3Page({ params }: PageProps) {
  const { setId } = await params;
  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);

  const ctx = await loadStudentVocabSetContext(supabase, profile!.id, setId, {
    items: "stage3",
    progress: "hub",
  });
  if (!ctx) notFound();
  if (ctx.set.exam_compact) {
    redirect(`/student/vocab/${setId}`);
  }
  if (!ctx.progress.stage2_completed) {
    redirect(`/student/vocab/${setId}`);
  }
  if (ctx.itemCount < 1) redirect(`/student/vocab/${setId}`);

  const questions = buildExampleBlankQuestions(ctx.items);
  const excludedCount = ctx.items.length - questions.length;

  return (
    <div className="py-6 sm:py-10">
      <VocabStage3ExampleBlank
        setId={setId}
        setTitle={ctx.set.title}
        itemCount={ctx.itemCount}
        questions={questions}
        excludedCount={excludedCount}
      />
    </div>
  );
}
