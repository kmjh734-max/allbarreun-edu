import { createClient } from "@/lib/supabase/server";
import { AdminManagement } from "@/components/admin/AdminManagement";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Profile } from "@/types/database";

export default async function AdminAdminsPage() {
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="관리자 계정"
        description="추가 관리자를 등록하고 아이디·비밀번호·활성 상태를 관리합니다. 로그인은 아이디와 비밀번호를 사용합니다."
      />

      <AdminManagement admins={(admins ?? []) as Profile[]} />
    </div>
  );
}
