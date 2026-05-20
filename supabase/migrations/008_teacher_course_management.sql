-- Teachers: create and delete their own courses (lessons/sections already managed via teacher_owns_course)

drop policy if exists "Teachers insert own courses" on public.courses;
create policy "Teachers insert own courses"
  on public.courses for insert
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
  );

drop policy if exists "Teachers delete own courses" on public.courses;
create policy "Teachers delete own courses"
  on public.courses for delete
  using (teacher_id = auth.uid());
