import type { Course, Profile } from "@/types/database";
import type { TreeNode } from "@/lib/ui/tree-types";

const UNASSIGNED_CLASS_ID = "__unassigned__";

export interface ClassStudentLink {
  student_id: string;
  class_id: string;
  class_name: string;
}

export interface ClassCourseLink {
  course_id: string;
  class_id: string;
  class_name: string;
}

function sortGroups(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type === "group" && b.type === "group") {
      if (a.id === UNASSIGNED_CLASS_ID) return 1;
      if (b.id === UNASSIGNED_CLASS_ID) return -1;
      return a.label.localeCompare(b.label, "ko");
    }
    return 0;
  });
}

function studentLeaf(student: Profile): TreeNode {
  return {
    type: "leaf",
    id: student.id,
    label: `${student.name} (${student.username ?? student.email})`,
    searchText: [student.name, student.username, student.email].join(" "),
  };
}

function courseLeaf(course: Course): TreeNode {
  return {
    type: "leaf",
    id: course.id,
    label: `${course.title}${!course.is_published ? " (비공개)" : ""}`,
    searchText: course.title,
  };
}

export function buildStudentPickerTree(
  students: Profile[],
  classLinks: ClassStudentLink[]
): TreeNode[] {
  const byClass = new Map<string, { name: string; studentIds: Set<string> }>();
  const assigned = new Set<string>();

  for (const link of classLinks) {
    assigned.add(link.student_id);
    let bucket = byClass.get(link.class_id);
    if (!bucket) {
      bucket = { name: link.class_name, studentIds: new Set() };
      byClass.set(link.class_id, bucket);
    }
    bucket.studentIds.add(link.student_id);
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const groups: TreeNode[] = [];

  for (const [classId, { name, studentIds }] of byClass) {
    const children = [...studentIds]
      .map((id) => studentById.get(id))
      .filter((s): s is Profile => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .map(studentLeaf);

    if (children.length > 0) {
      groups.push({
        type: "group",
        id: classId,
        label: name,
        searchText: name,
        children,
      });
    }
  }

  const unassigned = students
    .filter((s) => !assigned.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(studentLeaf);

  if (unassigned.length > 0) {
    groups.push({
      type: "group",
      id: UNASSIGNED_CLASS_ID,
      label: "반 미배정",
      searchText: "반 미배정",
      children: unassigned,
    });
  }

  return sortGroups(groups);
}

/** 강좌 배정용: 반·학년 그룹 없이 제목순 평면 목록 */
export function buildCoursePickerTree(courses: Course[]): TreeNode[] {
  return [...courses]
    .sort((a, b) => a.title.localeCompare(b.title, "ko"))
    .map(courseLeaf);
}
