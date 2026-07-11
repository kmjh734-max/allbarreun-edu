import { QuestionBankListClient } from "@/components/question-generator/QuestionBankListClient";

export default function Page() {
  return (
    <QuestionBankListClient
      basePath="/teacher/question-generator"
      status="approved"
      title="승인된 문제"
      description="승인된 문제를 조회하고 세트로 묶을 수 있습니다."
    />
  );
}
