import type {
  ClassCourseLink,
  ClassStudentLink,
} from "@/lib/ui/build-enrollment-trees";

type ClassRelation = { id: string; name: string } | { id: string; name: string }[] | null;

function unwrapClass(rel: ClassRelation): { id: string; name: string } | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export function parseClassStudentLinks(
  rows: { student_id: string; class_id: string; class: ClassRelation }[] | null
): ClassStudentLink[] {
  const links: ClassStudentLink[] = [];
  for (const row of rows ?? []) {
    const cls = unwrapClass(row.class);
    if (!cls) continue;
    links.push({
      student_id: row.student_id,
      class_id: row.class_id,
      class_name: cls.name,
    });
  }
  return links;
}

export function parseClassCourseLinks(
  rows: { course_id: string; class_id: string; class: ClassRelation }[] | null
): ClassCourseLink[] {
  const links: ClassCourseLink[] = [];
  for (const row of rows ?? []) {
    const cls = unwrapClass(row.class);
    if (!cls) continue;
    links.push({
      course_id: row.course_id,
      class_id: row.class_id,
      class_name: cls.name,
    });
  }
  return links;
}
