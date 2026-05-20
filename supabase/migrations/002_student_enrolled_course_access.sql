-- Fix: enrolled students could not read course rows when is_published = false,
-- so enrollments inserts succeeded but course joins returned null for students.

-- courses: enrolled students may read their assigned courses (published or not)
drop policy if exists "Students read enrolled published courses" on public.courses;

create policy "Students read enrolled courses"
  on public.courses for select
  using (
    public.is_student()
    and public.student_enrolled_in_course(id)
  );

-- sections: drop extra is_published gate on parent course
drop policy if exists "Students read sections of enrolled courses" on public.sections;

create policy "Students read sections of enrolled courses"
  on public.sections for select
  using (
    public.is_student()
    and public.student_enrolled_in_course(course_id)
  );

-- lessons: keep lesson-level publish flag; drop parent course is_published check
drop policy if exists "Students read published lessons in enrolled courses" on public.lessons;

create policy "Students read published lessons in enrolled courses"
  on public.lessons for select
  using (
    public.is_student()
    and is_published = true
    and public.student_enrolled_in_course(course_id)
  );

-- enrollments: explicit admin CRUD (clearer than single FOR ALL policy)
drop policy if exists "Admins full access enrollments" on public.enrollments;

create policy "Admins select enrollments"
  on public.enrollments for select
  using (public.is_admin());

create policy "Admins insert enrollments"
  on public.enrollments for insert
  with check (public.is_admin());

create policy "Admins update enrollments"
  on public.enrollments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete enrollments"
  on public.enrollments for delete
  using (public.is_admin());
