-- 프로덕션 Supabase SQL Editor에서 한 번 실행 (Vercel DB)
-- 오류: Could not find the 'created_by' column of 'profiles' in the schema cache
-- 실행 후 1~2분 대기 (API 스키마 캐시 갱신)

-- 004: username, is_active
alter table public.profiles
  add column if not exists username text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

update public.profiles
set username = lower(split_part(email, '@', 1))
where role = 'student'
  and username is null
  and email like '%@jslms.local';

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.is_admin());

-- 005: created_by
alter table public.profiles
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_created_by_idx on public.profiles(created_by);

drop policy if exists "Teachers can read students and teachers" on public.profiles;

drop policy if exists "Teachers read students they created" on public.profiles;
create policy "Teachers read students they created"
  on public.profiles for select
  using (
    public.is_teacher()
    and role = 'student'
    and created_by = auth.uid()
  );

drop policy if exists "Teachers read students enrolled in own courses" on public.profiles;
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

drop policy if exists "Teachers read peer teachers" on public.profiles;
create policy "Teachers read peer teachers"
  on public.profiles for select
  using (public.is_teacher() and role = 'teacher');

drop policy if exists "Teachers update students they created" on public.profiles;
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

drop policy if exists "Teachers insert enrollments for own courses" on public.enrollments;
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

drop policy if exists "Teachers delete enrollments for own courses" on public.enrollments;
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

-- 010: 안전한 가입 트리거 (009 대체)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'student');
  if meta_role not in ('admin', 'teacher', 'student') then
    meta_role := 'student';
  end if;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    meta_role
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;
