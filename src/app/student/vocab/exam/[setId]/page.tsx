import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ setId: string }>;
}

/** 학생 경로 QR → 로그인 없는 공개 학습으로 */
export default async function StudentExamVocabEntryPage({ params }: PageProps) {
  const { setId } = await params;
  redirect(`/exam-vocab/${setId}`);
}
