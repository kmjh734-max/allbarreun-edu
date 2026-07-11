import { GenerationDetailClient } from "@/components/question-generator/GenerationDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <GenerationDetailClient
      jobId={id}
      basePath="/teacher/question-generator"
    />
  );
}
