import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { CourseCreateForm } from "@/components/courses/CourseCreateForm";
import type { Profile } from "@/types/database";

export default async function NewCoursePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <Link
        href="/admin/courses"
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← 강좌 목록
      </Link>
      <h2 className="mb-2 text-xl font-semibold">새 강좌</h2>
      <p className="mb-6 text-sm text-slate-600">
        강좌 정보와 영상 목록을 한 번에 등록합니다.
      </p>
      <CourseCreateForm
        teachers={(teachers ?? []) as Profile[]}
        currentUserId={profile!.id}
      />
    </div>
  );
}
