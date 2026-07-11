import { VocabSetsOverview } from "@/components/vocab/VocabSetsOverview";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function AdminVocabSetsPage() {
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .eq("is_active", true)
    .order("name");

  return (
    <VocabSetsOverview
      role="admin"
      classesHref="/admin/classes"
      teachers={(teachers ?? []) as Profile[]}
    />
  );
}
