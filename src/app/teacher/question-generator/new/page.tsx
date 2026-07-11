import { Suspense } from "react";
import { QuestionGeneratorClient } from "@/components/question-generator/QuestionGeneratorClient";

export default function TeacherQuestionGeneratorNewPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">불러오는 중…</p>}>
      <QuestionGeneratorClient
        role="teacher"
        basePath="/teacher/question-generator"
      />
    </Suspense>
  );
}
