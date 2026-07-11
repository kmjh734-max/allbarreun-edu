import type { SupabaseClient } from "@supabase/supabase-js";

export interface BulkAssignResult {
  ok: true;
  assigned: number;
  skipped: number;
  setCount: number;
  studentCount: number;
}

export async function bulkAssignSets(
  supabase: SupabaseClient,
  setIds: string[],
  assignedBy: string,
  options: {
    classId?: string;
    studentIds?: string[];
  }
): Promise<BulkAssignResult | { ok: false; message: string }> {
  if (setIds.length === 0) {
    return { ok: false, message: "배정할 단어장이 없습니다." };
  }

  let targetIds: string[] = [];

  if (options.studentIds?.length) {
    targetIds = [...new Set(options.studentIds)];
  } else if (options.classId) {
    const { data: members, error: membersError } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", options.classId);

    if (membersError) return { ok: false, message: membersError.message };
    targetIds = (members ?? []).map((m) => m.student_id as string);
  } else {
    return { ok: false, message: "배정할 반 또는 학생을 선택해 주세요." };
  }

  if (targetIds.length === 0) {
    return { ok: false, message: "배정할 학생이 없습니다." };
  }

  const classId = options.classId ?? null;

  if (classId) {
    const memberCheck = await Promise.all(
      targetIds.map((sid) =>
        supabase
          .from("class_students")
          .select("id")
          .eq("class_id", classId)
          .eq("student_id", sid)
          .maybeSingle()
      )
    );
    const invalid = memberCheck.findIndex((r) => !r.data);
    if (invalid >= 0) {
      return { ok: false, message: "이 반에 등록된 학생이 아닙니다." };
    }
  }

  const { data: existingRows } = await supabase
    .from("vocab_assignments")
    .select("set_id, student_id")
    .in("set_id", setIds)
    .in("student_id", targetIds);

  const existingKeys = new Set(
    (existingRows ?? []).map((r) => `${r.set_id}:${r.student_id}`)
  );

  const toInsert: Array<{
    set_id: string;
    student_id: string;
    class_id: string | null;
    assigned_by: string;
  }> = [];

  for (const setId of setIds) {
    for (const studentId of targetIds) {
      const key = `${setId}:${studentId}`;
      if (!existingKeys.has(key)) {
        toInsert.push({
          set_id: setId,
          student_id: studentId,
          class_id: classId,
          assigned_by: assignedBy,
        });
      }
    }
  }

  const totalPairs = setIds.length * targetIds.length;
  const skipped = totalPairs - toInsert.length;

  if (toInsert.length === 0) {
    return {
      ok: true,
      assigned: 0,
      skipped,
      setCount: setIds.length,
      studentCount: targetIds.length,
    };
  }

  const chunkSize = 100;
  let assigned = 0;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("vocab_assignments").insert(chunk);
    if (error) {
      if (error.code === "23505") {
        assigned += chunk.length;
        continue;
      }
      return { ok: false, message: error.message };
    }
    assigned += chunk.length;
  }

  return {
    ok: true,
    assigned,
    skipped,
    setCount: setIds.length,
    studentCount: targetIds.length,
  };
}


export function formatBulkAssignSuccess(result: BulkAssignResult): string {
  const base = `단어장 ${result.setCount}개가 배정되었습니다. (신규 ${result.assigned}건`;
  if (result.skipped > 0) {
    return `${base}, ${result.skipped}건은 이미 배정됨)`;
  }
  return `${base})`;
}
