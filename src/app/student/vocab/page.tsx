import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { StudentVocabSetList } from "@/components/vocab/StudentVocabSetList";
import { fetchStudentVocabSummaries } from "@/lib/vocab/student-sets";

export default async function StudentVocabPage() {
  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);

  const summaries = await fetchStudentVocabSummaries(supabase, profile!.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">단어학습</h1>
        <p className="mt-1 text-sm text-slate-500">
          1단계 뜻 → 2단계 스펠링 → 3단계 종합테스트
        </p>
      </div>

      <StudentVocabSetList summaries={summaries} />

      <p className="text-center text-sm text-slate-500">
        <Link href="/student" className="text-brand-600 hover:underline">
          내 강의실로 돌아가기
        </Link>
      </p>
    </div>
  );
}
