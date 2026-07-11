import { VocabTodayStatusPanel } from "@/components/learning-status/VocabTodayStatusPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { listReportClasses } from "@/lib/reports/list-students";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVocabStatusPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const statusClasses = await listReportClasses(
    supabase,
    "admin",
    profile!.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="단어학습 현황"
        description="학생별 오늘 단어 학습 여부를 확인합니다."
      />
      <VocabTodayStatusPanel initialClasses={statusClasses} />
    </div>
  );
}
