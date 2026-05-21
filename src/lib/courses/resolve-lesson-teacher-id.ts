/**
 * lessons.teacher_id: 강좌 담당 강사가 있으면 그 ID, 없으면 등록자(관리자) ID
 */
export function resolveLessonTeacherId(
  courseTeacherId: string | null | undefined,
  fallbackUserId: string
): string {
  return courseTeacherId ?? fallbackUserId;
}
