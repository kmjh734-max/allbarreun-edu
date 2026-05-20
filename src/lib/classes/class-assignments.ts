import type { SupabaseClient } from "@supabase/supabase-js";

export type ClassActionResult =
  | { ok: true; message: string; enrolledCount?: number }
  | { ok: false; message: string };

/** Insert enrollment if missing; never removes existing rows. */
export async function ensureEnrollment(
  supabase: SupabaseClient,
  studentId: string,
  courseId: string,
  assignedBy: string | null
): Promise<{ created: boolean; error?: string }> {
  const { data: existing, error: lookupError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (lookupError) {
    return { created: false, error: lookupError.message };
  }

  if (existing) {
    return { created: false };
  }

  const { error: insertError } = await supabase.from("enrollments").insert({
    student_id: studentId,
    course_id: courseId,
    assigned_by: assignedBy,
  });

  if (insertError) {
    const duplicate =
      insertError.code === "23505" ||
      insertError.message.toLowerCase().includes("unique");
    if (duplicate) {
      return { created: false };
    }
    return { created: false, error: insertError.message };
  }

  return { created: true };
}

/** Enroll one student in all courses assigned to the class. */
export async function syncEnrollmentsForStudent(
  supabase: SupabaseClient,
  classId: string,
  studentId: string,
  assignedBy: string | null
): Promise<{ enrolledCount: number; errors: string[] }> {
  const { data: classCourses, error } = await supabase
    .from("class_courses")
    .select("course_id")
    .eq("class_id", classId);

  if (error) {
    return { enrolledCount: 0, errors: [error.message] };
  }

  let enrolledCount = 0;
  const errors: string[] = [];

  for (const row of classCourses ?? []) {
    const result = await ensureEnrollment(
      supabase,
      studentId,
      row.course_id,
      assignedBy
    );
    if (result.error) {
      errors.push(result.error);
    } else if (result.created) {
      enrolledCount += 1;
    }
  }

  return { enrolledCount, errors };
}

/** Enroll all students in the class for one course. */
export async function syncEnrollmentsForCourse(
  supabase: SupabaseClient,
  classId: string,
  courseId: string,
  assignedBy: string | null
): Promise<{ enrolledCount: number; errors: string[] }> {
  const { data: classStudents, error } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  if (error) {
    return { enrolledCount: 0, errors: [error.message] };
  }

  let enrolledCount = 0;
  const errors: string[] = [];

  for (const row of classStudents ?? []) {
    const result = await ensureEnrollment(
      supabase,
      row.student_id,
      courseId,
      assignedBy
    );
    if (result.error) {
      errors.push(result.error);
    } else if (result.created) {
      enrolledCount += 1;
    }
  }

  return { enrolledCount, errors };
}

export async function assignCourseToClass(
  supabase: SupabaseClient,
  params: {
    classId: string;
    courseId: string;
    assignedBy: string;
    /** When false, course.teacher_id must match class.teacher_id (teacher flow). */
    allowAnyCourse?: boolean;
  }
): Promise<ClassActionResult> {
  const { classId, courseId, assignedBy, allowAnyCourse = false } = params;

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, teacher_id, name, is_active")
    .eq("id", classId)
    .single();

  if (classError || !classRow) {
    return { ok: false, message: "반 정보를 찾을 수 없습니다." };
  }

  if (!classRow.is_active) {
    return { ok: false, message: "비활성화된 반에는 강좌를 배정할 수 없습니다." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, teacher_id")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return { ok: false, message: "강좌를 찾을 수 없습니다." };
  }

  if (!allowAnyCourse) {
    if (!classRow.teacher_id || course.teacher_id !== classRow.teacher_id) {
      return {
        ok: false,
        message: "담당 강사의 강좌만 이 반에 배정할 수 있습니다.",
      };
    }
  }

  const { data: existingLink } = await supabase
    .from("class_courses")
    .select("id")
    .eq("class_id", classId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingLink) {
    return { ok: false, message: "이미 이 반에 배정된 강좌입니다." };
  }

  const { error: linkError } = await supabase.from("class_courses").insert({
    class_id: classId,
    course_id: courseId,
    assigned_by: assignedBy,
  });

  if (linkError) {
    const duplicate =
      linkError.code === "23505" ||
      linkError.message.toLowerCase().includes("unique");
    return {
      ok: false,
      message: duplicate
        ? "이미 이 반에 배정된 강좌입니다."
        : linkError.message,
    };
  }

  const { enrolledCount, errors } = await syncEnrollmentsForCourse(
    supabase,
    classId,
    courseId,
    assignedBy
  );

  if (errors.length > 0) {
    return {
      ok: true,
      message: `강좌가 반에 배정되었습니다. 수강 배정 ${enrolledCount}건 완료 (일부 오류: ${errors[0]})`,
      enrolledCount,
    };
  }

  return {
    ok: true,
    message:
      enrolledCount > 0
        ? `강좌가 반에 배정되었고, 학생 ${enrolledCount}명에게 수강이 등록되었습니다.`
        : "강좌가 반에 배정되었습니다. (반에 학생이 없어 수강 배정은 없습니다.)",
    enrolledCount,
  };
}

export async function addStudentToClass(
  supabase: SupabaseClient,
  params: {
    classId: string;
    studentId: string;
    assignedBy: string;
  }
): Promise<ClassActionResult> {
  const { classId, studentId, assignedBy } = params;

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, is_active")
    .eq("id", classId)
    .single();

  if (classError || !classRow) {
    return { ok: false, message: "반 정보를 찾을 수 없습니다." };
  }

  if (!classRow.is_active) {
    return { ok: false, message: "비활성화된 반에는 학생을 추가할 수 없습니다." };
  }

  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select("id, role, is_active, name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { ok: false, message: "학생을 찾을 수 없습니다." };
  }

  if (student.role !== "student") {
    return { ok: false, message: "학생 계정만 반에 추가할 수 있습니다." };
  }

  if (student.is_active === false) {
    return { ok: false, message: "비활성화된 학생은 반에 추가할 수 없습니다." };
  }

  const { data: existingMember } = await supabase
    .from("class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingMember) {
    return { ok: false, message: "이미 이 반에 등록된 학생입니다." };
  }

  const { error: memberError } = await supabase.from("class_students").insert({
    class_id: classId,
    student_id: studentId,
  });

  if (memberError) {
    const duplicate =
      memberError.code === "23505" ||
      memberError.message.toLowerCase().includes("unique");
    return {
      ok: false,
      message: duplicate
        ? "이미 이 반에 등록된 학생입니다."
        : memberError.message,
    };
  }

  const { enrolledCount, errors } = await syncEnrollmentsForStudent(
    supabase,
    classId,
    studentId,
    assignedBy
  );

  if (errors.length > 0) {
    return {
      ok: true,
      message: `${student.name} 학생이 반에 추가되었습니다. 수강 배정 ${enrolledCount}건 (일부 오류: ${errors[0]})`,
      enrolledCount,
    };
  }

  return {
    ok: true,
    message:
      enrolledCount > 0
        ? `${student.name} 학생이 반에 추가되었고, 강좌 ${enrolledCount}개가 수강 배정되었습니다.`
        : `${student.name} 학생이 반에 추가되었습니다.`,
    enrolledCount,
  };
}

export async function removeCourseFromClass(
  supabase: SupabaseClient,
  classId: string,
  courseId: string
): Promise<ClassActionResult> {
  const { error } = await supabase
    .from("class_courses")
    .delete()
    .eq("class_id", classId)
    .eq("course_id", courseId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      "반에서 강좌 배정이 해제되었습니다. 학생의 기존 수강 등록은 유지됩니다.",
  };
}

export async function removeStudentFromClass(
  supabase: SupabaseClient,
  classId: string,
  studentId: string
): Promise<ClassActionResult> {
  const { error } = await supabase
    .from("class_students")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      "반에서 학생이 제거되었습니다. 기존 수강 등록은 유지됩니다.",
  };
}
