"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CompleteLessonButtonProps {
  lessonId: string;
  isCompleted: boolean;
}

export function CompleteLessonButton({
  lessonId,
  isCompleted: initialCompleted,
}: CompleteLessonButtonProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (isCompleted) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase.from("lesson_progress").upsert(
      {
        student_id: user.id,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: now,
        last_watched_at: now,
      },
      { onConflict: "student_id,lesson_id" }
    );

    if (!error) {
      setIsCompleted(true);
      router.refresh();
    }

    setLoading(false);
  }

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
        ✓ 수강 완료
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={loading}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
    >
      {loading ? "저장 중..." : "수강 완료"}
    </button>
  );
}
