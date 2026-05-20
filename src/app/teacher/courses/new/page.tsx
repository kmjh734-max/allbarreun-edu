import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { CourseCreateForm } from "@/components/courses/CourseCreateForm";

export default async function TeacherNewCoursePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    redirect("/login");
  }

  return (
    <div>
      <Link
        href="/teacher"
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← 강좌 관리
      </Link>
      <h2 className="mb-2 text-xl font-semibold">새 강좌</h2>
      <p className="mb-6 text-sm text-slate-600">
        강좌 정보와 영상 목록을 등록합니다. 생성된 강좌는 본인 담당으로
        배정됩니다.
      </p>
      <CourseCreateForm
        variant="teacher"
        currentUserId={profile.id}
      />
    </div>
  );
}
