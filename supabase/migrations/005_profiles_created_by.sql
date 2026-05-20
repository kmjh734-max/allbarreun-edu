-- Track which admin/teacher created a student account

alter table public.profiles
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_created_by_idx on public.profiles(created_by);

-- Narrow teacher access to student profiles (replace broad read-all-students policy)
drop policy if exists "Teachers can read students and teachers" on public.profiles;

create policy "Teachers read students they created"
  on public.profiles for select
  using (
    public.is_teacher()
    and role = 'student'
    and created_by = auth.uid()
  );

create policy "Teachers read students enrolled in own courses"
  on public.profiles for select
  using (
    public.is_teacher()
    and role = 'student'
    and exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.student_id = profiles.id
        and c.teacher_id = auth.uid()
    )
  );

create policy "Teachers read peer teachers"
  on public.profiles for select
  using (
    public.is_teacher()
    and role = 'teacher'
  );

create policy "Teachers update students they created"
  on public.profiles for update
  using (
    public.is_teacher()
    and role = 'student'
    and created_by = auth.uid()
  )
  with check (
    public.is_teacher()
    and role = 'student'
    and created_by = auth.uid()
  );

-- Teachers may assign their created students to their own courses
create policy "Teachers insert enrollments for own courses"
  on public.enrollments for insert
  with check (
    public.is_teacher()
    and public.teacher_owns_course(course_id)
    and exists (
      select 1 from public.profiles p
      where p.id = student_id
        and p.role = 'student'
        and p.created_by = auth.uid()
    )
  );

create policy "Teachers delete enrollments for own courses"
  on public.enrollments for delete
  using (
    public.is_teacher()
    and public.teacher_owns_course(course_id)
    and exists (
      select 1 from public.profiles p
      where p.id = student_id
        and p.created_by = auth.uid()
    )
  );
