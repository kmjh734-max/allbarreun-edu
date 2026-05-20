"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SectionFormProps {
  courseId: string;
  nextOrderIndex: number;
}

export function SectionForm({ courseId, nextOrderIndex }: SectionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const supabase = createClient();

    await supabase.from("sections").insert({
      course_id: courseId,
      title: title.trim(),
      order_index: nextOrderIndex,
    });

    setTitle("");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="section-title" className="mb-1 block text-sm font-medium text-slate-700">
          단원 제목
        </label>
        <input
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 1단원 문법"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50 sm:mb-0"
      >
        {loading ? "추가 중..." : "단원 추가"}
      </button>
    </form>
  );
}
