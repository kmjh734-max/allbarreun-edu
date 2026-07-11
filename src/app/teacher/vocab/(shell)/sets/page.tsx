import { VocabSetsOverview } from "@/components/vocab/VocabSetsOverview";

export default function TeacherVocabSetsPage() {
  return (
    <VocabSetsOverview role="teacher" classesHref="/teacher/classes" />
  );
}
