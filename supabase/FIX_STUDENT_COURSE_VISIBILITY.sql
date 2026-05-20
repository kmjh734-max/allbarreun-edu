-- 학생이 배정된 강좌/영상을 볼 수 있게 RLS 정책 수정 (002와 동일)
-- 증상: 수강 배정했는데 학생 화면에 강좌·영상이 안 보임 (강좌 비공개여도 배정만 되면 조회)

drop policy if exists "Students read enrolled published courses" on public.courses;

create policy "Students read enrolled courses"
  on public.courses for select
  using (
    public.is_student()
    and public.student_enrolled_in_course(id)
  );

drop policy if exists "Students read sections of enrolled courses" on public.sections;

create policy "Students read sections of enrolled courses"
  on public.sections for select
  using (
    public.is_student()
    and public.student_enrolled_in_course(course_id)
  );

drop policy if exists "Students read published lessons in enrolled courses" on public.lessons;

create policy "Students read published lessons in enrolled courses"
  on public.lessons for select
  using (
    public.is_student()
    and is_published = true
    and public.student_enrolled_in_course(course_id)
  );
