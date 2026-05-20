"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { extractVimeoVideoId } from "@/lib/vimeo/parse-url";
import type { Section } from "@/types/database";

interface LessonFormProps {
  courseId: string;
  teacherId: string;
  sections: Section[];
  /** 관리자 화면용 라벨 */
  uiVariant?: "default" | "admin";
}

export function LessonForm({
  courseId,
  teacherId,
  sections,
  uiVariant = "default",
}: LessonFormProps) {
  const isAdminUi = uiVariant === "admin";
  const router = useRouter();
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vimeoUrl, setVimeoUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionId || !title.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const vimeoVideoId = vimeoUrl ? extractVimeoVideoId(vimeoUrl) : null;

    if (vimeoUrl && !vimeoVideoId) {
      setError("올바른 동영상 링크(Vimeo)를 입력해 주세요.");
      setLoading(false);
      return;
    }

    const { data: maxLesson } = await supabase
      .from("lessons")
      .select("order_index")
      .eq("section_id", sectionId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const orderIndex = (maxLesson?.order_index ?? -1) + 1;

    let materialUrl: string | null = null;

    if (pdfFile) {
      const path = `${courseId}/${Date.now()}-${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(path, pdfFile, { upsert: false });

      if (uploadError) {
        setError(`PDF 업로드 실패: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("course-materials")
        .getPublicUrl(path);

      materialUrl = publicUrl.publicUrl;
    }

    const { error: insertError } = await supabase.from("lessons").insert({
      course_id: courseId,
      section_id: sectionId,
      teacher_id: teacherId,
      title: title.trim(),
      description: description || null,
      vimeo_url: vimeoUrl || null,
      vimeo_video_id: vimeoVideoId,
      material_url: materialUrl,
      order_index: orderIndex,
      is_published: isPublished,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setTitle("");
    setDescription("");
    setVimeoUrl("");
    setPdfFile(null);
    setIsPublished(false);
    router.refresh();
    setLoading(false);
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-amber-700">
        강의를 등록하려면 먼저 단원을 추가하세요.
      </p>
    );
  }

  const vimeoHelpText = isAdminUi
    ? "Vimeo에 업로드한 영상의 공유 링크를 붙여 넣어 주세요."
    : "Vimeo에 업로드한 영상 공유 링크를 붙여넣으세요.";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {isAdminUi ? "단원" : "소속 단원"}
        </label>
        <select
          required
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          강의 제목 <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          강의 설명 <span className="font-normal text-slate-400">(선택)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="강의에 대한 간단한 안내를 입력하세요."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {isAdminUi ? "Vimeo 영상 링크" : "Vimeo 영상 링크"}
        </label>
        <input
          type="url"
          value={vimeoUrl}
          onChange={(e) => setVimeoUrl(e.target.value)}
          placeholder="https://vimeo.com/123456789"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">{vimeoHelpText}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {isAdminUi ? "학습자료 PDF" : "학습자료 PDF"}{" "}
          <span className="font-normal text-slate-400">(선택)</span>
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-600"
        />
        <p className="mt-1 text-xs text-slate-500">
          PDF 파일이 있을 때만 업로드하세요. 없으면 비워 두셔도 됩니다.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        {isAdminUi ? "공개 여부 (학생에게 표시)" : "공개 여부 (학생에게 표시)"}
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "등록 중..." : "강의 등록"}
      </button>
    </form>
  );
}
