import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssignableStudent,
  ClassWithStudents,
  FolderAssignmentRow,
} from "@/components/vocab/VocabAssignmentPanel";

export async function loadAssignableStudents(
  supabase: SupabaseClient,
  role: "admin" | "teacher",
  userId: string
): Promise<AssignableStudent[]> {
  if (role === "admin") {
    const [{ data: students }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, username")
        .eq("role", "student")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("class_students")
        .select("student_id, class_id, class:classes(name, is_active)"),
    ]);

    const classInfoByStudent = new Map<
      string,
      { ids: string[]; names: string[] }
    >();

    for (const row of memberships ?? []) {
      const cls = Array.isArray(row.class) ? row.class[0] : row.class;
      const classRow = cls as { name?: string; is_active?: boolean } | null;
      if (!classRow?.name || classRow.is_active === false) continue;
      const name = classRow.name;
      const sid = row.student_id as string;
      const entry = classInfoByStudent.get(sid) ?? { ids: [], names: [] };
      entry.ids.push(row.class_id as string);
      entry.names.push(name);
      classInfoByStudent.set(sid, entry);
    }

    return (students ?? []).map((s) => {
      const info = classInfoByStudent.get(s.id as string);
      return {
        id: s.id as string,
        name: (s.name as string) || (s.username as string) || "—",
        username: (s.username as string | null) ?? null,
        classIds: info?.ids ?? [],
        classLabel: info?.names.length ? info.names.join(", ") : "반 없음",
      };
    });
  }

  const { data: teacherClasses } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", userId)
    .eq("is_active", true);

  const classIds = (teacherClasses ?? []).map((c) => c.id as string);
  const classNameById = new Map(
    (teacherClasses ?? []).map((c) => [c.id as string, c.name as string])
  );

  const studentIdSet = new Set<string>();
  const classInfoByStudent = new Map<
    string,
    { ids: string[]; names: string[] }
  >();

  if (classIds.length > 0) {
    const { data: members } = await supabase
      .from("class_students")
      .select("student_id, class_id")
      .in("class_id", classIds);

    for (const row of members ?? []) {
      const sid = row.student_id as string;
      studentIdSet.add(sid);
      const entry = classInfoByStudent.get(sid) ?? { ids: [], names: [] };
      const cid = row.class_id as string;
      entry.ids.push(cid);
      entry.names.push(classNameById.get(cid) ?? "—");
      classInfoByStudent.set(sid, entry);
    }
  }

  const { data: createdStudents } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("role", "student")
    .eq("is_active", true)
    .eq("created_by", userId);

  for (const s of createdStudents ?? []) {
    studentIdSet.add(s.id as string);
  }

  if (studentIdSet.size === 0) return [];

  const ids = [...studentIdSet];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, username")
    .in("id", ids)
    .order("name");

  return (profiles ?? []).map((s) => {
    const info = classInfoByStudent.get(s.id as string);
    return {
      id: s.id as string,
      name: (s.name as string) || (s.username as string) || "—",
      username: (s.username as string | null) ?? null,
      classIds: info?.ids ?? [],
      classLabel: info?.names.length ? info.names.join(", ") : "반 없음",
    };
  });
}

export async function loadFolderAssignPanelData(
  supabase: SupabaseClient,
  role: "admin" | "teacher",
  userId: string,
  folderId: string
): Promise<{
  classes: ClassWithStudents[];
  allStudents: AssignableStudent[];
  assignments: FolderAssignmentRow[];
  setCount: number;
  setTitles: string[];
}> {
  const [classesRes, setsRes, allStudents] = await Promise.all([
    role === "admin"
      ? supabase
          .from("classes")
          .select("id, name")
          .eq("is_active", true)
          .order("name")
      : supabase
          .from("classes")
          .select("id, name")
          .eq("teacher_id", userId)
          .eq("is_active", true)
          .order("name"),
    supabase
      .from("vocab_sets")
      .select("id, title")
      .eq("folder_id", folderId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    loadAssignableStudents(supabase, role, userId),
  ]);

  const setList = setsRes.data ?? [];
  const setIds = setList.map((s) => s.id as string);
  const setTitles = setList.map((s) => s.title as string);

  const assignmentsRes =
    setIds.length > 0
      ? await supabase
          .from("vocab_assignments")
          .select(
            "id, set_id, student_id, class_id, set:vocab_sets(title), student:profiles!vocab_assignments_student_id_fkey(name), class:classes(name)"
          )
          .in("set_id", setIds)
          .not("student_id", "is", null)
          .order("created_at", { ascending: false })
      : { data: [] };

  const classList = (classesRes.data ?? []) as { id: string; name: string }[];
  const classIds = classList.map((c) => c.id);

  const { data: memberRows } =
    classIds.length > 0
      ? await supabase
          .from("class_students")
          .select(
            "class_id, student_id, student:profiles!class_students_student_id_fkey(id, name)"
          )
          .in("class_id", classIds)
      : { data: [] };

  const studentsByClass = new Map<string, { id: string; name: string }[]>();
  for (const row of memberRows ?? []) {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const list = studentsByClass.get(row.class_id as string) ?? [];
    list.push({
      id: row.student_id as string,
      name: (student as { name?: string } | null)?.name ?? "—",
    });
    studentsByClass.set(row.class_id as string, list);
  }

  const classes: ClassWithStudents[] = classList.map((c) => ({
    id: c.id,
    name: c.name,
    students: studentsByClass.get(c.id) ?? [],
  }));

  const assignments: FolderAssignmentRow[] = (assignmentsRes.data ?? []).map(
    (row) => {
      const set = Array.isArray(row.set) ? row.set[0] : row.set;
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      const cls = Array.isArray(row.class) ? row.class[0] : row.class;
      return {
        id: row.id as string,
        set_id: row.set_id as string,
        student_id: row.student_id as string,
        class_id: row.class_id as string | null,
        set_title: (set as { title?: string } | null)?.title ?? "—",
        student_name: (student as { name?: string } | null)?.name ?? "—",
        class_name: (cls as { name?: string } | null)?.name ?? "—",
      };
    }
  );

  return {
    classes,
    allStudents,
    assignments,
    setCount: setList.length,
    setTitles,
  };
}

export async function loadSetAssignPanelData(
  supabase: SupabaseClient,
  role: "admin" | "teacher",
  userId: string,
  setId: string
): Promise<{
  classes: ClassWithStudents[];
  allStudents: AssignableStudent[];
  assignments: FolderAssignmentRow[];
  setCount: number;
  setTitles: string[];
}> {
  const { data: set } = await supabase
    .from("vocab_sets")
    .select("id, title")
    .eq("id", setId)
    .single();

  if (!set) {
    return {
      classes: [],
      allStudents: [],
      assignments: [],
      setCount: 0,
      setTitles: [],
    };
  }

  const [classesRes, allStudents, assignmentsRes] = await Promise.all([
    role === "admin"
      ? supabase
          .from("classes")
          .select("id, name")
          .eq("is_active", true)
          .order("name")
      : supabase
          .from("classes")
          .select("id, name")
          .eq("teacher_id", userId)
          .eq("is_active", true)
          .order("name"),
    loadAssignableStudents(supabase, role, userId),
    supabase
      .from("vocab_assignments")
      .select(
        "id, set_id, student_id, class_id, set:vocab_sets(title), student:profiles!vocab_assignments_student_id_fkey(name), class:classes(name)"
      )
      .eq("set_id", setId)
      .not("student_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const classList = (classesRes.data ?? []) as { id: string; name: string }[];
  const classIds = classList.map((c) => c.id);

  const { data: memberRows } =
    classIds.length > 0
      ? await supabase
          .from("class_students")
          .select(
            "class_id, student_id, student:profiles!class_students_student_id_fkey(id, name)"
          )
          .in("class_id", classIds)
      : { data: [] };

  const studentsByClass = new Map<string, { id: string; name: string }[]>();
  for (const row of memberRows ?? []) {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const list = studentsByClass.get(row.class_id as string) ?? [];
    list.push({
      id: row.student_id as string,
      name: (student as { name?: string } | null)?.name ?? "—",
    });
    studentsByClass.set(row.class_id as string, list);
  }

  const classes: ClassWithStudents[] = classList.map((c) => ({
    id: c.id,
    name: c.name,
    students: studentsByClass.get(c.id) ?? [],
  }));

  const assignments: FolderAssignmentRow[] = (assignmentsRes.data ?? []).map(
    (row) => {
      const setRow = Array.isArray(row.set) ? row.set[0] : row.set;
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      const cls = Array.isArray(row.class) ? row.class[0] : row.class;
      return {
        id: row.id as string,
        set_id: row.set_id as string,
        student_id: row.student_id as string,
        class_id: row.class_id as string | null,
        set_title: (setRow as { title?: string } | null)?.title ?? "—",
        student_name: (student as { name?: string } | null)?.name ?? "—",
        class_name: (cls as { name?: string } | null)?.name ?? "—",
      };
    }
  );

  return {
    classes,
    allStudents,
    assignments,
    setCount: 1,
    setTitles: [set.title as string],
  };
}
