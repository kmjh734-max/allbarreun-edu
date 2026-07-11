import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabStage3ResultView } from "@/components/vocab/VocabStage3ResultView";
import {
  loadFinalAttemptDetail,
  loadLatestFinalAttemptDetail,
} from "@/lib/vocab/load-final-attempt";

interface PageProps {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function StudentVocabStage4ResultPage({
  params,
  searchParams,
}: PageProps) {
  const { setId } = await params;
  const { attemptId } = await searchParams;

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const detail = attemptId
    ? await loadFinalAttemptDetail(supabase, attemptId, profile!.id)
    : await loadLatestFinalAttemptDetail(supabase, setId, profile!.id);

  if (!detail || detail.attempt.set_id !== setId) notFound();

  return (
    <div className="py-6 sm:py-10">
      <VocabStage3ResultView
        setId={setId}
        setTitle={detail.setTitle}
        attempt={detail.attempt}
        answers={detail.answers}
        stageNumber={4}
      />
    </div>
  );
}
