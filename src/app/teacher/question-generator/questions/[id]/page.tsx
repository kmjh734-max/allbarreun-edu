import { QuestionDetailClient } from "@/components/question-generator/QuestionDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <QuestionDetailClient
      questionId={id}
      basePath="/teacher/question-generator"
    />
  );
}
