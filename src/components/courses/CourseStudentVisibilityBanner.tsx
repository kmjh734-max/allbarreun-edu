"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CourseStudentVisibilityBannerProps {
  courseId: string;
  courseTitle: string;
  courseIsPublished: boolean;
  publishedLessonCount: number;
  totalLessonCount: number;
  enrollmentCount: number;
}

export function CourseStudentVisibilityBanner({
  courseId,
  courseTitle,
  courseIsPublished,
  publishedLessonCount,
  totalLessonCount,
  enrollmentCount,
}: CourseStudentVisibilityBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasPublishedLessons = publishedLessonCount > 0;
  const hasEnrollments = enrollmentCount > 0;
  const ready =
    courseIsPublished && hasPublishedLessons && hasEnrollments;

  async function publishForStudents() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { error: courseError } = await supabase
      .from("courses")
      .update({ is_published: true })
      .eq("id", courseId);

    if (courseError) {
      setMessage(courseError.message);
      setLoading(false);
      return;
    }

    const { error: lessonError } = await supabase
      .from("lessons")
      .update({ is_published: true })
      .eq("course_id", courseId);

    if (lessonError) {
      setMessage(lessonError.message);
      setLoading(false);
      return;
    }

    setMessage("강좌와 영상을 학생에게 공개했습니다.");
    setLoading(false);
    router.refresh();
  }

  if (ready) {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        학생 화면에 표시 준비가 되었습니다. (수강 배정 {enrollmentCount}명 · 공개
        영상 {publishedLessonCount}개)
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">학생에게 아직 안 보일 수 있습니다</p>
      <p className="mt-1 text-amber-900">
        「{courseTitle}」 — 아래 3가지가 모두 필요합니다.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1">
        <li className={hasEnrollments ? "text-green-800" : ""}>
          수강 배정:{" "}
          {hasEnrollments
            ? `${enrollmentCount}명 배정됨`
            : "없음 → "}
          {!hasEnrollments && (
            <Link href="/admin/students#assign" className="font-medium underline">
              학생·수강에서 배정
            </Link>
          )}
        </li>
        <li className={courseIsPublished ? "text-green-800" : ""}>
          강좌 공개: {courseIsPublished ? "공개됨" : "비공개 (학생 목록에 안 나올 수 있음)"}
        </li>
        <li className={hasPublishedLessons ? "text-green-800" : ""}>
          영상 공개:{" "}
          {hasPublishedLessons
            ? `${publishedLessonCount} / ${totalLessonCount}개 공개`
            : `0 / ${totalLessonCount}개 (영상 등록 시 「학생에게 공개」 체크 필요)`}
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || totalLessonCount === 0}
          onClick={() => void publishForStudents()}
          className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
        >
          {loading ? "처리 중..." : "강좌·영상 모두 학생에게 공개"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs">{message}</p>}
      <p className="mt-3 text-xs text-amber-800">
        Supabase에서 학생이 비공개 강좌도 보도록 하려면{" "}
        <code className="rounded bg-amber-100 px-1">
          FIX_STUDENT_COURSE_VISIBILITY.sql
        </code>{" "}
        실행이 필요할 수 있습니다.
      </p>
    </div>
  );
}
