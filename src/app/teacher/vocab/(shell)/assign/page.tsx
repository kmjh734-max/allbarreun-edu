import { VocabAssignHub } from "@/components/vocab/VocabAssignHub";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { loadVocabAssignHubData } from "@/lib/vocab/load-assign-hub";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherVocabAssignPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { folders, unfiledSets } = await loadVocabAssignHubData(
    supabase,
    "teacher",
    profile!.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="단어세트 배정하기"
        description="폴더·단어세트를 반·학생에게 배정합니다."
      />
      <VocabAssignHub
        role="teacher"
        folders={folders}
        unfiledSets={unfiledSets}
      />
    </div>
  );
}
