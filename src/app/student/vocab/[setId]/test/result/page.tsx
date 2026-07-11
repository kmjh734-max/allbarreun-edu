import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

/** 구 결과 URL → 3단계 결과 */
export default async function StudentVocabTestResultRedirect({
  params,
  searchParams,
}: PageProps) {
  const { setId } = await params;
  const { attemptId } = await searchParams;
  const q = attemptId ? `?attemptId=${attemptId}` : "";
  redirect(`/student/vocab/${setId}/stage3/result${q}`);
}
