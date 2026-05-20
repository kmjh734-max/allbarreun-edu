-- English Academy LMS - Initial Schema + RLS

-- Extensions
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_email_idx on public.profiles(email);

-- Auto-create profile on signup (default role: student; admin sets role manually)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  thumbnail_url text,
  teacher_id uuid references public.profiles(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index courses_teacher_id_idx on public.courses(teacher_id);

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------
create table public.sections (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index sections_course_id_idx on public.sections(course_id);

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  vimeo_url text,
  vimeo_video_id text,
  material_url text,
  order_index int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index lessons_course_id_idx on public.lessons(course_id);
create index lessons_section_id_idx on public.lessons(section_id);

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index enrollments_student_id_idx on public.enrollments(student_id);
create index enrollments_course_id_idx on public.enrollments(course_id);

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------
create table public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_watched_at timestamptz,
  unique (student_id, lesson_id)
);

create index lesson_progress_student_id_idx on public.lesson_progress(student_id);
create index lesson_progress_lesson_id_idx on public.lesson_progress(lesson_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for PDF materials
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: current user role
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student'
  );
$$;

-- Teacher owns course
create or replace function public.teacher_owns_course(course_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.courses
    where id = course_uuid and teacher_id = auth.uid()
  );
$$;

-- Student enrolled in course
create or replace function public.student_enrolled_in_course(course_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = course_uuid and student_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Teachers can read students and teachers"
  on public.profiles for select
  using (
    public.is_teacher()
    and role in ('student', 'teacher')
  );

create policy "Users can update own profile name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- courses
create policy "Admins full access courses"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Teachers read own courses"
  on public.courses for select
  using (teacher_id = auth.uid());

create policy "Teachers update own courses"
  on public.courses for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Students read enrolled published courses"
  on public.courses for select
  using (
    public.is_student()
    and is_published = true
    and public.student_enrolled_in_course(id)
  );

-- sections
create policy "Admins full access sections"
  on public.sections for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Teachers manage sections in own courses"
  on public.sections for all
  using (public.teacher_owns_course(course_id))
  with check (public.teacher_owns_course(course_id));

create policy "Students read sections of enrolled courses"
  on public.sections for select
  using (
    public.is_student()
    and public.student_enrolled_in_course(course_id)
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_published = true
    )
  );

-- lessons
create policy "Admins full access lessons"
  on public.lessons for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Teachers manage lessons in own courses"
  on public.lessons for all
  using (public.teacher_owns_course(course_id))
  with check (public.teacher_owns_course(course_id));

create policy "Students read published lessons in enrolled courses"
  on public.lessons for select
  using (
    public.is_student()
    and is_published = true
    and public.student_enrolled_in_course(course_id)
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_published = true
    )
  );

-- enrollments
create policy "Admins full access enrollments"
  on public.enrollments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Teachers read enrollments for own courses"
  on public.enrollments for select
  using (public.teacher_owns_course(course_id));

create policy "Students read own enrollments"
  on public.enrollments for select
  using (student_id = auth.uid());

-- lesson_progress
create policy "Admins read all lesson progress"
  on public.lesson_progress for select
  using (public.is_admin());

create policy "Teachers read progress for own course lessons"
  on public.lesson_progress for select
  using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and c.teacher_id = auth.uid()
    )
  );

create policy "Students manage own lesson progress"
  on public.lesson_progress for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Storage policies (course-materials)
create policy "Authenticated users can read materials"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'course-materials');

create policy "Teachers and admins can upload materials"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'course-materials'
    and (public.is_admin() or public.is_teacher())
  );

create policy "Teachers and admins can update materials"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'course-materials' and (public.is_admin() or public.is_teacher()));

create policy "Admins can delete materials"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-materials' and public.is_admin());
