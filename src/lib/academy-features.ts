import { ACADEMY_ID } from "@/config/academy";

/** 단어학습 — 올바른교육·정수학원에서 사용 */
export function isVocabEnabled(): boolean {
  return ACADEMY_ID === "allbarreun" || ACADEMY_ID === "jeongsu";
}

export function filterNavItems<T extends { href: string }>(items: T[]): T[] {
  if (isVocabEnabled()) return items;
  return items.filter((item) => !item.href.includes("/vocab"));
}

export function isVocabPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/vocab") ||
    pathname.startsWith("/teacher/vocab") ||
    pathname.startsWith("/student/vocab") ||
    pathname.startsWith("/api/vocab")
  );
}
