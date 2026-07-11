import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

/** @deprecated 3단계 종합테스트 → 4단계로 이동 */
export default async function StudentVocabStage3ResultRedirect({
  params,
  searchParams,
}: PageProps) {
  const { setId } = await params;
  const { attemptId } = await searchParams;
  const q = attemptId ? `?attemptId=${attemptId}` : "";
  redirect(`/student/vocab/${setId}/stage4/result${q}`);
}
