-- Vocabulary learning (stage 1): sets, items, assignments, progress

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vocab_sets_teacher_id_idx on public.vocab_sets(teacher_id);
create index if not exists vocab_sets_created_by_idx on public.vocab_sets(created_by);

create table if not exists public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  word text not null,
  meaning text not null,
  part_of_speech text,
  example_sentence text,
  example_meaning text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vocab_items_set_id_idx on public.vocab_items(set_id);

create table if not exists public.vocab_assignments (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vocab_assignments_target_check check (
    student_id is not null or class_id is not null
  )
);

create unique index if not exists vocab_assignments_set_student_uidx
  on public.vocab_assignments(set_id, student_id)
  where student_id is not null;

create unique index if not exists vocab_assignments_set_class_uidx
  on public.vocab_assignments(set_id, class_id)
  where class_id is not null;

create index if not exists vocab_assignments_set_id_idx on public.vocab_assignments(set_id);
create index if not exists vocab_assignments_student_id_idx on public.vocab_assignments(student_id);
create index if not exists vocab_assignments_class_id_idx on public.vocab_assignments(class_id);

create table if not exists public.vocab_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.vocab_items(id) on delete cascade,
  status text not null default 'unknown'
    check (status in ('unknown', 'known', 'review')),
  studied_count int not null default 0,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create index if not exists vocab_progress_student_id_idx on public.vocab_progress(student_id);
create index if not exists vocab_progress_item_id_idx on public.vocab_progress(item_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.teacher_owns_vocab_set(set_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vocab_sets
    where id = set_uuid and teacher_id = auth.uid()
  );
$$;

create or replace function public.teacher_created_vocab_set(set_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vocab_sets
    where id = set_uuid and created_by = auth.uid()
  );
$$;

create or replace function public.teacher_can_manage_vocab_set(set_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.teacher_owns_vocab_set(set_uuid)
    or public.teacher_created_vocab_set(set_uuid);
$$;

create or replace function public.student_assigned_vocab_set(set_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vocab_assignments va
    where va.set_id = set_uuid
      and (
        va.student_id = auth.uid()
        or exists (
          select 1
          from public.class_students cs
          where cs.class_id = va.class_id
            and cs.student_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.teacher_can_assign_vocab_to_student(
  target_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_student_id
      and p.role = 'student'
      and (
        p.created_by = auth.uid()
        or exists (
          select 1
          from public.class_students cs
          join public.classes cl on cl.id = cs.class_id
          where cs.student_id = target_student_id
            and cl.teacher_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vocab_sets enable row level security;
alter table public.vocab_items enable row level security;
alter table public.vocab_assignments enable row level security;
alter table public.vocab_progress enable row level security;

-- vocab_sets (admin)
drop policy if exists "Admins select vocab_sets" on public.vocab_sets;
drop policy if exists "Admins insert vocab_sets" on public.vocab_sets;
drop policy if exists "Admins update vocab_sets" on public.vocab_sets;
drop policy if exists "Admins delete vocab_sets" on public.vocab_sets;

create policy "Admins select vocab_sets"
  on public.vocab_sets for select using (public.is_admin());

create policy "Admins insert vocab_sets"
  on public.vocab_sets for insert with check (public.is_admin());

create policy "Admins update vocab_sets"
  on public.vocab_sets for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete vocab_sets"
  on public.vocab_sets for delete using (public.is_admin());

-- vocab_sets (teacher)
drop policy if exists "Teachers select own vocab_sets" on public.vocab_sets;
drop policy if exists "Teachers insert vocab_sets" on public.vocab_sets;
drop policy if exists "Teachers update own vocab_sets" on public.vocab_sets;
drop policy if exists "Teachers delete own vocab_sets" on public.vocab_sets;

create policy "Teachers select own vocab_sets"
  on public.vocab_sets for select
  using (public.is_teacher() and public.teacher_can_manage_vocab_set(id));

create policy "Teachers insert vocab_sets"
  on public.vocab_sets for insert
  with check (
    public.is_teacher()
    and created_by = auth.uid()
    and (teacher_id is null or teacher_id = auth.uid())
  );

create policy "Teachers update own vocab_sets"
  on public.vocab_sets for update
  using (public.is_teacher() and public.teacher_can_manage_vocab_set(id))
  with check (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(id)
    and (teacher_id is null or teacher_id = auth.uid())
  );

create policy "Teachers delete own vocab_sets"
  on public.vocab_sets for delete
  using (public.is_teacher() and public.teacher_can_manage_vocab_set(id));

-- vocab_sets (student: published + assigned)
drop policy if exists "Students select assigned published vocab_sets" on public.vocab_sets;

create policy "Students select assigned published vocab_sets"
  on public.vocab_sets for select
  using (
    public.is_student()
    and is_published = true
    and public.student_assigned_vocab_set(id)
  );

-- vocab_items (admin)
drop policy if exists "Admins select vocab_items" on public.vocab_items;
drop policy if exists "Admins insert vocab_items" on public.vocab_items;
drop policy if exists "Admins update vocab_items" on public.vocab_items;
drop policy if exists "Admins delete vocab_items" on public.vocab_items;

create policy "Admins select vocab_items"
  on public.vocab_items for select using (public.is_admin());

create policy "Admins insert vocab_items"
  on public.vocab_items for insert with check (public.is_admin());

create policy "Admins update vocab_items"
  on public.vocab_items for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete vocab_items"
  on public.vocab_items for delete using (public.is_admin());

-- vocab_items (teacher via set)
drop policy if exists "Teachers select vocab_items for own sets" on public.vocab_items;
drop policy if exists "Teachers insert vocab_items for own sets" on public.vocab_items;
drop policy if exists "Teachers update vocab_items for own sets" on public.vocab_items;
drop policy if exists "Teachers delete vocab_items for own sets" on public.vocab_items;

create policy "Teachers select vocab_items for own sets"
  on public.vocab_items for select
  using (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

create policy "Teachers insert vocab_items for own sets"
  on public.vocab_items for insert
  with check (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

create policy "Teachers update vocab_items for own sets"
  on public.vocab_items for update
  using (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  )
  with check (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

create policy "Teachers delete vocab_items for own sets"
  on public.vocab_items for delete
  using (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

-- vocab_items (student)
drop policy if exists "Students select vocab_items for assigned sets" on public.vocab_items;

create policy "Students select vocab_items for assigned sets"
  on public.vocab_items for select
  using (
    public.is_student()
    and exists (
      select 1 from public.vocab_sets vs
      where vs.id = vocab_items.set_id
        and vs.is_published = true
        and public.student_assigned_vocab_set(vs.id)
    )
  );

-- vocab_assignments (admin)
drop policy if exists "Admins select vocab_assignments" on public.vocab_assignments;
drop policy if exists "Admins insert vocab_assignments" on public.vocab_assignments;
drop policy if exists "Admins update vocab_assignments" on public.vocab_assignments;
drop policy if exists "Admins delete vocab_assignments" on public.vocab_assignments;

create policy "Admins select vocab_assignments"
  on public.vocab_assignments for select using (public.is_admin());

create policy "Admins insert vocab_assignments"
  on public.vocab_assignments for insert with check (public.is_admin());

create policy "Admins update vocab_assignments"
  on public.vocab_assignments for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete vocab_assignments"
  on public.vocab_assignments for delete using (public.is_admin());

-- vocab_assignments (teacher)
drop policy if exists "Teachers select vocab_assignments for own sets" on public.vocab_assignments;
drop policy if exists "Teachers insert vocab_assignments for own sets" on public.vocab_assignments;
drop policy if exists "Teachers delete vocab_assignments for own sets" on public.vocab_assignments;

create policy "Teachers select vocab_assignments for own sets"
  on public.vocab_assignments for select
  using (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

create policy "Teachers insert vocab_assignments for own sets"
  on public.vocab_assignments for insert
  with check (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
    and (
      (student_id is not null and public.teacher_can_assign_vocab_to_student(student_id))
      or (class_id is not null and public.teacher_owns_class(class_id))
    )
  );

create policy "Teachers delete vocab_assignments for own sets"
  on public.vocab_assignments for delete
  using (
    public.is_teacher()
    and public.teacher_can_manage_vocab_set(set_id)
  );

-- vocab_assignments (student read own)
drop policy if exists "Students select own vocab_assignments" on public.vocab_assignments;

create policy "Students select own vocab_assignments"
  on public.vocab_assignments for select
  using (
    public.is_student()
    and (
      student_id = auth.uid()
      or public.student_in_class(class_id)
    )
  );

-- vocab_progress (admin)
drop policy if exists "Admins select vocab_progress" on public.vocab_progress;
drop policy if exists "Admins insert vocab_progress" on public.vocab_progress;
drop policy if exists "Admins update vocab_progress" on public.vocab_progress;
drop policy if exists "Admins delete vocab_progress" on public.vocab_progress;

create policy "Admins select vocab_progress"
  on public.vocab_progress for select using (public.is_admin());

create policy "Admins insert vocab_progress"
  on public.vocab_progress for insert with check (public.is_admin());

create policy "Admins update vocab_progress"
  on public.vocab_progress for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete vocab_progress"
  on public.vocab_progress for delete using (public.is_admin());

-- vocab_progress (teacher read for manageable students)
drop policy if exists "Teachers select vocab_progress for own students" on public.vocab_progress;

create policy "Teachers select vocab_progress for own students"
  on public.vocab_progress for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_assign_vocab_to_student(student_id)
      or exists (
        select 1
        from public.vocab_items vi
        where vi.id = vocab_progress.item_id
          and public.teacher_can_manage_vocab_set(vi.set_id)
      )
    )
  );

-- vocab_progress (student)
drop policy if exists "Students select own vocab_progress" on public.vocab_progress;
drop policy if exists "Students insert own vocab_progress" on public.vocab_progress;
drop policy if exists "Students update own vocab_progress" on public.vocab_progress;

create policy "Students select own vocab_progress"
  on public.vocab_progress for select
  using (public.is_student() and student_id = auth.uid());

create policy "Students insert own vocab_progress"
  on public.vocab_progress for insert
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.vocab_items vi
      join public.vocab_sets vs on vs.id = vi.set_id
      where vi.id = vocab_progress.item_id
        and vs.is_published = true
        and public.student_assigned_vocab_set(vs.id)
    )
  );

create policy "Students update own vocab_progress"
  on public.vocab_progress for update
  using (public.is_student() and student_id = auth.uid())
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.vocab_items vi
      join public.vocab_sets vs on vs.id = vi.set_id
      where vi.id = vocab_progress.item_id
        and vs.is_published = true
        and public.student_assigned_vocab_set(vs.id)
    )
  );
