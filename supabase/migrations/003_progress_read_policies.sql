-- Progress pages: reinforce read access for admin/teacher dashboards.
-- Existing 001 policies already cover these cases; this migration is idempotent
-- documentation for deployments that may have customized RLS.

-- Admin: full read on lesson_progress (001: "Admins read all lesson progress")
-- Teacher: read progress for lessons in own courses (001: "Teachers read progress for own course lessons")
-- Teacher: read enrollments for own courses (001: "Teachers read enrollments for own courses")

-- Ensure teachers can read student profiles when viewing enrollment joins
drop policy if exists "Teachers can read students and teachers" on public.profiles;

create policy "Teachers can read students and teachers"
  on public.profiles for select
  using (
    public.is_teacher()
    and role in ('student', 'teacher')
  );
