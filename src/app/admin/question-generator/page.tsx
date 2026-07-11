import { GenerationsListClient } from "@/components/question-generator/GenerationsListClient";

export default function AdminQuestionGeneratorPage() {
  return <GenerationsListClient basePath="/admin/question-generator" />;
}
