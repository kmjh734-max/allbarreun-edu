import { QuestionBankListClient } from "@/components/question-generator/QuestionBankListClient";

export default function Page() {
  return (
    <QuestionBankListClient
      basePath="/admin/question-generator"
      status="needs_review"
      title="검수 대기"
      description="자동 검수 미통과 또는 보류된 문제를 검토합니다."
    />
  );
}
