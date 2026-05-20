-- Classes (반) and bulk course assignment via class_students / class_courses

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists classes_created_by_idx on public.classes(created_by);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists class_students_class_id_idx on public.class_students(class_id);
create index if not exists class_students_student_id_idx on public.class_students(student_id);

create table if not exists public.class_courses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, course_id)
);

create index if not exists class_courses_class_id_idx on public.class_courses(class_id);
create index if not exists class_courses_course_id_idx on public.class_courses(course_id);

-- enrollments already has unique(student_id, course_id) in 001_initial_schema.sql
-- Re-assert safely if an older DB missed it:
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_student_id_course_id_key'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_student_id_course_id_key
      unique (student_id, course_id);
  end if;
exception
  when unique_violation then
    raise notice 'Could not add enrollments unique: duplicate rows exist. Clean duplicates first.';
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.teacher_owns_class(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = class_uuid and teacher_id = auth.uid()
  );
$$;

create or replace function public.student_in_class(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_students
    where class_id = class_uuid and student_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.class_courses enable row level security;

-- classes
drop policy if exists "Admins full access classes" on public.classes;
drop policy if exists "Admins select classes" on public.classes;
drop policy if exists "Admins insert classes" on public.classes;
drop policy if exists "Admins update classes" on public.classes;
drop policy if exists "Admins delete classes" on public.classes;

create policy "Admins select classes"
  on public.classes for select
  using (public.is_admin());

create policy "Admins insert classes"
  on public.classes for insert
  with check (public.is_admin());

create policy "Admins update classes"
  on public.classes for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete classes"
  on public.classes for delete
  using (public.is_admin());

drop policy if exists "Teachers read own classes" on public.classes;
create policy "Teachers read own classes"
  on public.classes for select
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists "Students read own classes" on public.classes;
create policy "Students read own classes"
  on public.classes for select
  using (public.is_student() and public.student_in_class(id));

-- class_students
drop policy if exists "Admins full access class_students" on public.class_students;

create policy "Admins select class_students"
  on public.class_students for select
  using (public.is_admin());

create policy "Admins insert class_students"
  on public.class_students for insert
  with check (public.is_admin());

create policy "Admins update class_students"
  on public.class_students for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete class_students"
  on public.class_students for delete
  using (public.is_admin());

drop policy if exists "Teachers read class_students for own classes" on public.class_students;
create policy "Teachers read class_students for own classes"
  on public.class_students for select
  using (public.is_teacher() and public.teacher_owns_class(class_id));

drop policy if exists "Teachers insert class_students for own classes" on public.class_students;
create policy "Teachers insert class_students for own classes"
  on public.class_students for insert
  with check (public.is_teacher() and public.teacher_owns_class(class_id));

drop policy if exists "Teachers delete class_students for own classes" on public.class_students;
create policy "Teachers delete class_students for own classes"
  on public.class_students for delete
  using (public.is_teacher() and public.teacher_owns_class(class_id));

drop policy if exists "Students read own class_students" on public.class_students;
create policy "Students read own class_students"
  on public.class_students for select
  using (public.is_student() and student_id = auth.uid());

-- class_courses
drop policy if exists "Admins full access class_courses" on public.class_courses;

create policy "Admins select class_courses"
  on public.class_courses for select
  using (public.is_admin());

create policy "Admins insert class_courses"
  on public.class_courses for insert
  with check (public.is_admin());

create policy "Admins update class_courses"
  on public.class_courses for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete class_courses"
  on public.class_courses for delete
  using (public.is_admin());

drop policy if exists "Teachers read class_courses for own classes" on public.class_courses;
create policy "Teachers read class_courses for own classes"
  on public.class_courses for select
  using (public.is_teacher() and public.teacher_owns_class(class_id));

drop policy if exists "Teachers insert class_courses for own classes" on public.class_courses;
create policy "Teachers insert class_courses for own classes"
  on public.class_courses for insert
  with check (
    public.is_teacher()
    and public.teacher_owns_class(class_id)
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers delete class_courses for own classes" on public.class_courses;
create policy "Teachers delete class_courses for own classes"
  on public.class_courses for delete
  using (public.is_teacher() and public.teacher_owns_class(class_id));

-- Teachers: insert enrollments for students in own classes when course is theirs
drop policy if exists "Teachers insert enrollments for class students" on public.enrollments;
create policy "Teachers insert enrollments for class students"
  on public.enrollments for insert
  with check (
    public.is_teacher()
    and public.teacher_owns_course(course_id)
    and exists (
      select 1
      from public.class_students cs
      join public.classes cl on cl.id = cs.class_id
      where cs.student_id = enrollments.student_id
        and cl.teacher_id = auth.uid()
    )
  );
