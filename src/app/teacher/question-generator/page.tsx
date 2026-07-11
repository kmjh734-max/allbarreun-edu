import { GenerationsListClient } from "@/components/question-generator/GenerationsListClient";

export default function TeacherQuestionGeneratorPage() {
  return <GenerationsListClient basePath="/teacher/question-generator" />;
}
