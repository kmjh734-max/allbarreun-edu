import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ setId: string }>;
}

/** @deprecated 4단계 종합테스트로 이동 */
export default async function StudentVocabTestRedirect({
  params,
}: PageProps) {
  const { setId } = await params;
  redirect(`/student/vocab/${setId}/stage4`);
}
