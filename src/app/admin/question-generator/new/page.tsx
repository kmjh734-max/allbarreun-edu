import { Suspense } from "react";
import { QuestionGeneratorClient } from "@/components/question-generator/QuestionGeneratorClient";

export default function AdminQuestionGeneratorNewPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">불러오는 중…</p>}>
      <QuestionGeneratorClient
        role="admin"
        basePath="/admin/question-generator"
      />
    </Suspense>
  );
}
