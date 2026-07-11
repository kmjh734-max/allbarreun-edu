import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ setId: string }>;
}

/** 1단계 뜻 익히기로 통합됨 */
export default async function StudentVocabStudyRedirect({
  params,
}: PageProps) {
  const { setId } = await params;
  redirect(`/student/vocab/${setId}`);
}
