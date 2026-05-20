import { redirect } from "next/navigation";

/** 수강 강좌 메뉴 — 내 강의실과 동일 목록 */
export default function StudentCoursesPage() {
  redirect("/student");
}
