import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { StudentLessonWatch } from "@/components/lessons/StudentLessonWatch";
import type { Lesson } from "@/types/database";

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function StudentLessonPage({ params }: PageProps) {
  const { courseId, lessonId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", profile!.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enrollment) notFound();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .eq("is_published", true)
    .single();

  if (!lesson) notFound();

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("is_completed, progress_percent, watched_seconds")
    .eq("student_id", profile!.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const typedLesson = lesson as Lesson;
  const isCompleted = progress?.is_completed ?? false;
  const progressPercent =
    progress &&
    "progress_percent" in progress &&
    typeof progress.progress_percent === "number"
      ? progress.progress_percent
      : 0;

  return (
    <div>
      <Link
        href={`/student/courses/${courseId}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← 영상 목록
      </Link>

      <h2 className="mt-4 text-xl font-semibold">{typedLesson.title}</h2>
      {typedLesson.description && (
        <p className="mt-2 text-sm text-slate-600">{typedLesson.description}</p>
      )}

      <div className="mt-6">
        <StudentLessonWatch
          lessonId={lessonId}
          vimeoUrl={typedLesson.vimeo_url}
          vimeoVideoId={typedLesson.vimeo_video_id}
          title={typedLesson.title}
          initialIsCompleted={isCompleted}
          initialProgressPercent={progressPercent}
          initialWatchedSeconds={
            progress &&
            "watched_seconds" in progress &&
            typeof progress.watched_seconds === "number"
              ? progress.watched_seconds
              : 0
          }
          materialUrl={typedLesson.material_url}
        />
      </div>
    </div>
  );
}
