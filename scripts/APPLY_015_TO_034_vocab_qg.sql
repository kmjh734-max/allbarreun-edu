-- ========== 015_add_vocab_learning.sql ==========

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




-- ========== 016_vocab_student_assignment_only.sql ==========

-- Students see vocab by assignment only (not is_published flag)

drop policy if exists "Students select assigned published vocab_sets" on public.vocab_sets;

create policy "Students select assigned vocab_sets"
  on public.vocab_sets for select
  using (
    public.is_student()
    and public.student_assigned_vocab_set(id)
  );

drop policy if exists "Students select vocab_items for assigned sets" on public.vocab_items;

create policy "Students select vocab_items for assigned sets"
  on public.vocab_items for select
  using (
    public.is_student()
    and exists (
      select 1 from public.vocab_sets vs
      where vs.id = vocab_items.set_id
        and public.student_assigned_vocab_set(vs.id)
    )
  );

drop policy if exists "Students insert own vocab_progress" on public.vocab_progress;
drop policy if exists "Students update own vocab_progress" on public.vocab_progress;

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
        and public.student_assigned_vocab_set(vs.id)
    )
  );

-- Existing sets: treat as visible when assigned
update public.vocab_sets set is_published = true where is_published = false;




-- ========== 017_vocab_folders.sql ==========

-- Vocabulary folders (organize vocab_sets; classes handle student assignment)

create table if not exists public.vocab_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vocab_folders_teacher_id_idx on public.vocab_folders(teacher_id);
create index if not exists vocab_folders_created_by_idx on public.vocab_folders(created_by);

alter table public.vocab_sets
  add column if not exists folder_id uuid references public.vocab_folders(id) on delete set null;

create index if not exists vocab_sets_folder_id_idx on public.vocab_sets(folder_id);

-- Backfill: one default folder per creator for existing sets
insert into public.vocab_folders (name, teacher_id, created_by)
select distinct '기본 폴더', teacher_id, created_by
from public.vocab_sets
where created_by is not null
  and not exists (
    select 1 from public.vocab_folders vf
    where vf.created_by = vocab_sets.created_by
      and vf.name = '기본 폴더'
  );

update public.vocab_sets vs
set folder_id = vf.id
from public.vocab_folders vf
where vs.folder_id is null
  and vs.created_by = vf.created_by
  and vf.name = '기본 폴더';

-- Helpers
create or replace function public.teacher_owns_vocab_folder(folder_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vocab_folders
    where id = folder_uuid
      and (teacher_id = auth.uid() or created_by = auth.uid())
  );
$$;

create or replace function public.teacher_can_manage_vocab_folder(folder_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.teacher_owns_vocab_folder(folder_uuid);
$$;

-- RLS vocab_folders
alter table public.vocab_folders enable row level security;

drop policy if exists "Admins select vocab_folders" on public.vocab_folders;
drop policy if exists "Admins insert vocab_folders" on public.vocab_folders;
drop policy if exists "Admins update vocab_folders" on public.vocab_folders;
drop policy if exists "Admins delete vocab_folders" on public.vocab_folders;

create policy "Admins select vocab_folders"
  on public.vocab_folders for select using (public.is_admin());
create policy "Admins insert vocab_folders"
  on public.vocab_folders for insert with check (public.is_admin());
create policy "Admins update vocab_folders"
  on public.vocab_folders for update
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete vocab_folders"
  on public.vocab_folders for delete using (public.is_admin());

drop policy if exists "Teachers select own vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers insert vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers update own vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers delete own vocab_folders" on public.vocab_folders;

create policy "Teachers select own vocab_folders"
  on public.vocab_folders for select
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

create policy "Teachers insert vocab_folders"
  on public.vocab_folders for insert
  with check (
    public.is_teacher()
    and created_by = auth.uid()
    and (teacher_id is null or teacher_id = auth.uid())
  );

create policy "Teachers update own vocab_folders"
  on public.vocab_folders for update
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id))
  with check (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

create policy "Teachers delete own vocab_folders"
  on public.vocab_folders for delete
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

-- Teachers: vocab_sets in own folders
drop policy if exists "Teachers insert vocab_sets" on public.vocab_sets;
create policy "Teachers insert vocab_sets"
  on public.vocab_sets for insert
  with check (
    public.is_teacher()
    and created_by = auth.uid()
    and (teacher_id is null or teacher_id = auth.uid())
    and (
      folder_id is null
      or public.teacher_can_manage_vocab_folder(folder_id)
    )
  );




-- ========== 018_vocab_tests.sql ==========

-- Vocab tests (stage 2): attempts + per-question answers

create table if not exists public.vocab_test_attempts (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  test_type text not null check (
    test_type in ('meaning_choice', 'word_choice', 'spelling')
  ),
  score int not null default 0,
  total_questions int not null default 0,
  correct_count int not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vocab_test_attempts_set_id_idx
  on public.vocab_test_attempts(set_id);
create index if not exists vocab_test_attempts_student_id_idx
  on public.vocab_test_attempts(student_id);
create index if not exists vocab_test_attempts_set_student_idx
  on public.vocab_test_attempts(set_id, student_id);

create table if not exists public.vocab_test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.vocab_test_attempts(id) on delete cascade,
  item_id uuid not null references public.vocab_items(id) on delete cascade,
  question_type text not null check (
    question_type in ('meaning_choice', 'word_choice', 'spelling')
  ),
  question_text text,
  correct_answer text,
  student_answer text,
  is_correct boolean not null default false,
  choices jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vocab_test_answers_attempt_id_idx
  on public.vocab_test_answers(attempt_id);
create index if not exists vocab_test_answers_item_id_idx
  on public.vocab_test_answers(item_id);

-- Teacher may view attempts for own sets or assignable students
create or replace function public.teacher_can_view_vocab_test_attempt(attempt_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vocab_test_attempts vta
    where vta.id = attempt_uuid
      and (
        public.teacher_can_manage_vocab_set(vta.set_id)
        or public.teacher_can_assign_vocab_to_student(vta.student_id)
      )
  );
$$;

alter table public.vocab_test_attempts enable row level security;
alter table public.vocab_test_answers enable row level security;

-- vocab_test_attempts (admin)
drop policy if exists "Admins select vocab_test_attempts" on public.vocab_test_attempts;
drop policy if exists "Admins insert vocab_test_attempts" on public.vocab_test_attempts;
drop policy if exists "Admins delete vocab_test_attempts" on public.vocab_test_attempts;

create policy "Admins select vocab_test_attempts"
  on public.vocab_test_attempts for select using (public.is_admin());

create policy "Admins insert vocab_test_attempts"
  on public.vocab_test_attempts for insert with check (public.is_admin());

create policy "Admins delete vocab_test_attempts"
  on public.vocab_test_attempts for delete using (public.is_admin());

-- vocab_test_attempts (teacher)
drop policy if exists "Teachers select vocab_test_attempts" on public.vocab_test_attempts;

create policy "Teachers select vocab_test_attempts"
  on public.vocab_test_attempts for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

-- vocab_test_attempts (student)
drop policy if exists "Students select own vocab_test_attempts" on public.vocab_test_attempts;
drop policy if exists "Students insert own vocab_test_attempts" on public.vocab_test_attempts;

create policy "Students select own vocab_test_attempts"
  on public.vocab_test_attempts for select
  using (public.is_student() and student_id = auth.uid());

create policy "Students insert own vocab_test_attempts"
  on public.vocab_test_attempts for insert
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

-- vocab_test_answers (admin)
drop policy if exists "Admins select vocab_test_answers" on public.vocab_test_answers;
drop policy if exists "Admins insert vocab_test_answers" on public.vocab_test_answers;
drop policy if exists "Admins delete vocab_test_answers" on public.vocab_test_answers;

create policy "Admins select vocab_test_answers"
  on public.vocab_test_answers for select using (public.is_admin());

create policy "Admins insert vocab_test_answers"
  on public.vocab_test_answers for insert with check (public.is_admin());

create policy "Admins delete vocab_test_answers"
  on public.vocab_test_answers for delete using (public.is_admin());

-- vocab_test_answers (teacher)
drop policy if exists "Teachers select vocab_test_answers" on public.vocab_test_answers;

create policy "Teachers select vocab_test_answers"
  on public.vocab_test_answers for select
  using (
    public.is_teacher()
    and public.teacher_can_view_vocab_test_attempt(attempt_id)
  );

-- vocab_test_answers (student)
drop policy if exists "Students select own vocab_test_answers" on public.vocab_test_answers;
drop policy if exists "Students insert own vocab_test_answers" on public.vocab_test_answers;

create policy "Students select own vocab_test_answers"
  on public.vocab_test_answers for select
  using (
    public.is_student()
    and exists (
      select 1
      from public.vocab_test_attempts vta
      where vta.id = vocab_test_answers.attempt_id
        and vta.student_id = auth.uid()
    )
  );

create policy "Students insert own vocab_test_answers"
  on public.vocab_test_answers for insert
  with check (
    public.is_student()
    and exists (
      select 1
      from public.vocab_test_attempts vta
      where vta.id = vocab_test_answers.attempt_id
        and vta.student_id = auth.uid()
        and public.student_assigned_vocab_set(vta.set_id)
    )
  );




-- ========== 019_vocab_sessions.sql ==========

-- Vocab learning sessions (rounds + final exam phase)

create table if not exists public.vocab_set_sessions (
  student_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  rounds_completed int not null default 0,
  phase text not null default 'learning'
    check (phase in ('learning', 'final', 'completed')),
  final_attempt_id uuid references public.vocab_test_attempts(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (student_id, set_id)
);

create index if not exists vocab_set_sessions_set_id_idx
  on public.vocab_set_sessions(set_id);

alter table public.vocab_set_sessions enable row level security;

drop policy if exists "Admins manage vocab_set_sessions" on public.vocab_set_sessions;
create policy "Admins manage vocab_set_sessions"
  on public.vocab_set_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_set_sessions" on public.vocab_set_sessions;
create policy "Teachers select vocab_set_sessions"
  on public.vocab_set_sessions for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

drop policy if exists "Students manage own vocab_set_sessions" on public.vocab_set_sessions;
create policy "Students manage own vocab_set_sessions"
  on public.vocab_set_sessions for all
  using (public.is_student() and student_id = auth.uid())
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

-- Extend test types for final exam + AI meaning
alter table public.vocab_test_attempts
  drop constraint if exists vocab_test_attempts_test_type_check;

alter table public.vocab_test_attempts
  add constraint vocab_test_attempts_test_type_check
  check (test_type in (
    'meaning_choice', 'word_choice', 'spelling', 'final_exam'
  ));

alter table public.vocab_test_answers
  drop constraint if exists vocab_test_answers_question_type_check;

alter table public.vocab_test_answers
  add constraint vocab_test_answers_question_type_check
  check (question_type in (
    'meaning_choice', 'word_choice', 'spelling', 'meaning_ai'
  ));




-- ========== 020_vocab_three_stages.sql ==========

-- 3-stage vocab learning (stage progress + spelling log + final test)

create table if not exists public.vocab_stage_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  stage1_completed boolean not null default false,
  stage1_completed_at timestamptz,
  stage1_seen_item_ids uuid[] not null default '{}',
  stage2_completed boolean not null default false,
  stage2_completed_at timestamptz,
  stage3_passed boolean not null default false,
  stage3_best_score int not null default 0,
  stage3_last_score int not null default 0,
  stage3_attempt_count int not null default 0,
  stage3_passed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, set_id)
);

create index if not exists vocab_stage_progress_set_id_idx
  on public.vocab_stage_progress(set_id);
create index if not exists vocab_stage_progress_student_id_idx
  on public.vocab_stage_progress(student_id);

create table if not exists public.vocab_spelling_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  item_id uuid not null references public.vocab_items(id) on delete cascade,
  student_answer text,
  is_correct boolean not null default false,
  attempt_round int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists vocab_spelling_attempts_set_student_idx
  on public.vocab_spelling_attempts(set_id, student_id);

create table if not exists public.vocab_final_test_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  score int not null default 0,
  total_questions int not null default 0,
  correct_count int not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vocab_final_test_attempts_set_student_idx
  on public.vocab_final_test_attempts(set_id, student_id);

create table if not exists public.vocab_final_test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.vocab_final_test_attempts(id) on delete cascade,
  item_id uuid not null references public.vocab_items(id) on delete cascade,
  question_type text not null check (question_type in ('meaning', 'spelling')),
  question_text text,
  correct_answer text,
  student_answer text,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vocab_final_test_answers_attempt_id_idx
  on public.vocab_final_test_answers(attempt_id);

-- Teacher may view stage progress for own sets or assignable students
create or replace function public.teacher_can_view_vocab_stage_progress(progress_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vocab_stage_progress vsp
    where vsp.id = progress_uuid
      and (
        public.teacher_can_manage_vocab_set(vsp.set_id)
        or public.teacher_can_assign_vocab_to_student(vsp.student_id)
      )
  );
$$;

create or replace function public.teacher_can_view_vocab_final_attempt(attempt_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vocab_final_test_attempts vfta
    where vfta.id = attempt_uuid
      and (
        public.teacher_can_manage_vocab_set(vfta.set_id)
        or public.teacher_can_assign_vocab_to_student(vfta.student_id)
      )
  );
$$;

alter table public.vocab_stage_progress enable row level security;
alter table public.vocab_spelling_attempts enable row level security;
alter table public.vocab_final_test_attempts enable row level security;
alter table public.vocab_final_test_answers enable row level security;

-- vocab_stage_progress
drop policy if exists "Admins manage vocab_stage_progress" on public.vocab_stage_progress;
create policy "Admins manage vocab_stage_progress"
  on public.vocab_stage_progress for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_stage_progress" on public.vocab_stage_progress;
create policy "Teachers select vocab_stage_progress"
  on public.vocab_stage_progress for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

drop policy if exists "Students manage own vocab_stage_progress" on public.vocab_stage_progress;
create policy "Students manage own vocab_stage_progress"
  on public.vocab_stage_progress for all
  using (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

-- vocab_spelling_attempts
drop policy if exists "Admins manage vocab_spelling_attempts" on public.vocab_spelling_attempts;
create policy "Admins manage vocab_spelling_attempts"
  on public.vocab_spelling_attempts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_spelling_attempts" on public.vocab_spelling_attempts;
create policy "Teachers select vocab_spelling_attempts"
  on public.vocab_spelling_attempts for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

drop policy if exists "Students insert own vocab_spelling_attempts" on public.vocab_spelling_attempts;
create policy "Students insert own vocab_spelling_attempts"
  on public.vocab_spelling_attempts for insert
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

drop policy if exists "Students select own vocab_spelling_attempts" on public.vocab_spelling_attempts;
create policy "Students select own vocab_spelling_attempts"
  on public.vocab_spelling_attempts for select
  using (
    public.is_student()
    and student_id = auth.uid()
  );

-- vocab_final_test_attempts
drop policy if exists "Admins manage vocab_final_test_attempts" on public.vocab_final_test_attempts;
create policy "Admins manage vocab_final_test_attempts"
  on public.vocab_final_test_attempts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_final_test_attempts" on public.vocab_final_test_attempts;
create policy "Teachers select vocab_final_test_attempts"
  on public.vocab_final_test_attempts for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

drop policy if exists "Students manage own vocab_final_test_attempts" on public.vocab_final_test_attempts;
create policy "Students manage own vocab_final_test_attempts"
  on public.vocab_final_test_attempts for all
  using (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

-- vocab_final_test_answers
drop policy if exists "Admins manage vocab_final_test_answers" on public.vocab_final_test_answers;
create policy "Admins manage vocab_final_test_answers"
  on public.vocab_final_test_answers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_final_test_answers" on public.vocab_final_test_answers;
create policy "Teachers select vocab_final_test_answers"
  on public.vocab_final_test_answers for select
  using (
    public.is_teacher()
    and public.teacher_can_view_vocab_final_attempt(attempt_id)
  );

drop policy if exists "Students manage own vocab_final_test_answers" on public.vocab_final_test_answers;
create policy "Students manage own vocab_final_test_answers"
  on public.vocab_final_test_answers for all
  using (
    public.is_student()
    and exists (
      select 1
      from public.vocab_final_test_attempts vfta
      where vfta.id = attempt_id
        and vfta.student_id = auth.uid()
    )
  )
  with check (
    public.is_student()
    and exists (
      select 1
      from public.vocab_final_test_attempts vfta
      where vfta.id = attempt_id
        and vfta.student_id = auth.uid()
        and public.student_assigned_vocab_set(vfta.set_id)
    )
  );




-- ========== 021_vocab_ai_feedback.sql ==========

-- AI feedback for stage 3 meaning answers

alter table public.vocab_final_test_answers
  add column if not exists ai_feedback text;




-- ========== 022_vocab_sets_order.sql ==========

-- Folder内 단어세트 표시 순서

alter table public.vocab_sets
  add column if not exists order_index int not null default 0;

create index if not exists vocab_sets_folder_order_idx
  on public.vocab_sets (folder_id, order_index);

-- 기존 데이터: 폴더별 created_at 순으로 order_index 부여
with ranked as (
  select
    id,
    row_number() over (
      partition by folder_id
      order by created_at asc, id asc
    ) - 1 as rn
  from public.vocab_sets
  where folder_id is not null
)
update public.vocab_sets vs
set order_index = ranked.rn
from ranked
where vs.id = ranked.id;




-- ========== 023_vocab_stage_four.sql ==========

-- 4-stage vocab learning: stage3 = example blank, stage4 = final test

alter table public.vocab_stage_progress
  add column if not exists stage3_completed boolean not null default false,
  add column if not exists stage3_completed_at timestamptz,
  add column if not exists stage4_passed boolean not null default false,
  add column if not exists stage4_best_score int not null default 0,
  add column if not exists stage4_last_score int not null default 0,
  add column if not exists stage4_attempt_count int not null default 0,
  add column if not exists stage4_passed_at timestamptz;

-- Migrate existing final-test (old stage 3) scores into stage 4 columns
update public.vocab_stage_progress
set
  stage4_passed = stage3_passed,
  stage4_best_score = coalesce(stage3_best_score, 0),
  stage4_last_score = coalesce(stage3_last_score, 0),
  stage4_attempt_count = coalesce(stage3_attempt_count, 0),
  stage4_passed_at = stage3_passed_at
where coalesce(stage3_attempt_count, 0) > 0
  and coalesce(stage4_attempt_count, 0) = 0;

-- Students who passed the old stage-3 final test are treated as stage-3 complete
update public.vocab_stage_progress
set
  stage3_completed = true,
  stage3_completed_at = coalesce(stage3_completed_at, stage3_passed_at, updated_at)
where coalesce(stage3_passed, false) = true
  and coalesce(stage3_completed, false) = false;

create table if not exists public.vocab_example_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  item_id uuid not null references public.vocab_items(id) on delete cascade,
  student_answer text not null default '',
  correct_answer text not null default '',
  is_correct boolean not null default false,
  attempt_round int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_vocab_example_attempts_student_set
  on public.vocab_example_attempts(student_id, set_id);

alter table public.vocab_example_attempts enable row level security;

drop policy if exists "Admins manage vocab_example_attempts" on public.vocab_example_attempts;
create policy "Admins manage vocab_example_attempts"
  on public.vocab_example_attempts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers select vocab_example_attempts" on public.vocab_example_attempts;
create policy "Teachers select vocab_example_attempts"
  on public.vocab_example_attempts for select
  using (
    public.is_teacher()
    and (
      public.teacher_can_manage_vocab_set(set_id)
      or public.teacher_can_assign_vocab_to_student(student_id)
    )
  );

drop policy if exists "Students insert own vocab_example_attempts" on public.vocab_example_attempts;
create policy "Students insert own vocab_example_attempts"
  on public.vocab_example_attempts for insert
  with check (
    public.is_student()
    and student_id = auth.uid()
    and public.student_assigned_vocab_set(set_id)
  );

drop policy if exists "Students select own vocab_example_attempts" on public.vocab_example_attempts;
create policy "Students select own vocab_example_attempts"
  on public.vocab_example_attempts for select
  using (
    public.is_student()
    and student_id = auth.uid()
  );




-- ========== 024_vocab_synonyms_antonyms.sql ==========

-- vocab_items: 동의어·반의어 (세트 편집 시 AI 생성 후 저장)
alter table public.vocab_items
  add column if not exists synonyms text,
  add column if not exists antonyms text;




-- ========== 025_english_question_generator.sql ==========

-- 영어 변형문제 생성기

-- ---------------------------------------------------------------------------
-- english_source_passages
-- ---------------------------------------------------------------------------
create table if not exists public.english_source_passages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  passage text not null,
  school_name text,
  grade text not null default '고1',
  source_type text not null default '자체 지문',
  source_detail text,
  overall_difficulty text not null default '기본',
  analysis jsonb,
  draft_config jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists english_source_passages_created_by_idx
  on public.english_source_passages(created_by);
create index if not exists english_source_passages_created_at_idx
  on public.english_source_passages(created_at desc);

-- ---------------------------------------------------------------------------
-- question_generation_presets
-- ---------------------------------------------------------------------------
create table if not exists public.question_generation_presets (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_generation_presets_created_by_idx
  on public.question_generation_presets(created_by);

-- ---------------------------------------------------------------------------
-- question_generation_jobs
-- ---------------------------------------------------------------------------
create table if not exists public.question_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.english_source_passages(id) on delete cascade,
  generation_mode text not null default 'custom',
  preset_id uuid references public.question_generation_presets(id) on delete set null,
  request_config jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in (
      'pending', 'analyzing', 'generating', 'validating',
      'partially_completed', 'completed', 'failed'
    )),
  progress_message text,
  total_requested integer not null default 0,
  total_completed integer not null default 0,
  total_failed integer not null default 0,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists question_generation_jobs_created_by_idx
  on public.question_generation_jobs(created_by);
create index if not exists question_generation_jobs_passage_id_idx
  on public.question_generation_jobs(passage_id);
create index if not exists question_generation_jobs_status_idx
  on public.question_generation_jobs(status);

-- ---------------------------------------------------------------------------
-- generated_english_questions
-- ---------------------------------------------------------------------------
create table if not exists public.generated_english_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.english_source_passages(id) on delete cascade,
  generation_job_id uuid references public.question_generation_jobs(id) on delete set null,
  option_key text,
  category text not null,
  question_type text not null,
  difficulty text not null default 'default',
  choice_language text,
  passage_original text not null,
  passage_modified text,
  instruction text not null default '',
  question_text text not null default '',
  choices jsonb,
  correct_answer jsonb,
  acceptable_answers jsonb,
  explanation text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  scoring_guide jsonb,
  validation_result jsonb,
  validation_score integer,
  status text not null default 'draft'
    check (status in ('draft', 'needs_review', 'approved', 'archived')),
  generation_attempt integer not null default 1,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_english_questions_passage_id_idx
  on public.generated_english_questions(passage_id);
create index if not exists generated_english_questions_job_id_idx
  on public.generated_english_questions(generation_job_id);
create index if not exists generated_english_questions_status_idx
  on public.generated_english_questions(status);
create index if not exists generated_english_questions_created_by_idx
  on public.generated_english_questions(created_by);
create index if not exists generated_english_questions_type_idx
  on public.generated_english_questions(question_type);

-- ---------------------------------------------------------------------------
-- question_edit_history
-- ---------------------------------------------------------------------------
create table if not exists public.question_edit_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.generated_english_questions(id) on delete cascade,
  before_data jsonb,
  after_data jsonb,
  edited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists question_edit_history_question_id_idx
  on public.question_edit_history(question_id);

-- ---------------------------------------------------------------------------
-- english_question_sets (승인 문제 묶음)
-- ---------------------------------------------------------------------------
create table if not exists public.english_question_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  items jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists english_question_sets_created_by_idx
  on public.english_question_sets(created_by);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_english_passage(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.english_source_passages p
      where p.id = p_id and p.created_by = auth.uid()
    );
$$;

create or replace function public.can_manage_generated_question(q_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.generated_english_questions q
      where q.id = q_id and q.created_by = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.english_source_passages enable row level security;
alter table public.question_generation_presets enable row level security;
alter table public.question_generation_jobs enable row level security;
alter table public.generated_english_questions enable row level security;
alter table public.question_edit_history enable row level security;
alter table public.english_question_sets enable row level security;

-- passages
drop policy if exists "Admins manage english passages" on public.english_source_passages;
create policy "Admins manage english passages"
  on public.english_source_passages for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers manage own english passages" on public.english_source_passages;
create policy "Teachers manage own english passages"
  on public.english_source_passages for all
  using (created_by = auth.uid() and public.is_teacher())
  with check (created_by = auth.uid() and public.is_teacher());

-- presets: everyone staff can read system; own personal; admin all
drop policy if exists "Staff read presets" on public.question_generation_presets;
create policy "Staff read presets"
  on public.question_generation_presets for select
  using (
    public.is_admin()
    or public.is_teacher()
  );

drop policy if exists "Admins manage presets" on public.question_generation_presets;
create policy "Admins manage presets"
  on public.question_generation_presets for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers manage own presets" on public.question_generation_presets;
create policy "Teachers manage own presets"
  on public.question_generation_presets for all
  using (created_by = auth.uid() and public.is_teacher() and is_system = false)
  with check (created_by = auth.uid() and public.is_teacher() and is_system = false);

-- jobs
drop policy if exists "Admins manage generation jobs" on public.question_generation_jobs;
create policy "Admins manage generation jobs"
  on public.question_generation_jobs for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers manage own generation jobs" on public.question_generation_jobs;
create policy "Teachers manage own generation jobs"
  on public.question_generation_jobs for all
  using (created_by = auth.uid() and public.is_teacher())
  with check (created_by = auth.uid() and public.is_teacher());

-- questions
drop policy if exists "Admins manage generated questions" on public.generated_english_questions;
create policy "Admins manage generated questions"
  on public.generated_english_questions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers manage own generated questions" on public.generated_english_questions;
create policy "Teachers manage own generated questions"
  on public.generated_english_questions for all
  using (created_by = auth.uid() and public.is_teacher())
  with check (created_by = auth.uid() and public.is_teacher());

-- edit history
drop policy if exists "Staff read edit history of manageable questions" on public.question_edit_history;
create policy "Staff read edit history of manageable questions"
  on public.question_edit_history for select
  using (public.can_manage_generated_question(question_id));

drop policy if exists "Staff insert edit history" on public.question_edit_history;
create policy "Staff insert edit history"
  on public.question_edit_history for insert
  with check (
    public.can_manage_generated_question(question_id)
    and edited_by = auth.uid()
  );

-- sets
drop policy if exists "Admins manage question sets" on public.english_question_sets;
create policy "Admins manage question sets"
  on public.english_question_sets for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers manage own question sets" on public.english_question_sets;
create policy "Teachers manage own question sets"
  on public.english_question_sets for all
  using (created_by = auth.uid() and public.is_teacher())
  with check (created_by = auth.uid() and public.is_teacher());

-- ---------------------------------------------------------------------------
-- Seed system presets (idempotent by slug)
-- ---------------------------------------------------------------------------
insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'basic_set',
    '기본 종합세트',
    '제목·주제·불일치·빈칸·어법·어휘·영작 중심 7문항',
    '{"counts":{"title:en:high":1,"topic:en:high":1,"content_false:ko:high":1,"sentence_blank:en:mid":1,"grammar:na:mid":1,"vocabulary:na:mid":1,"writing:na:mid":1}}'::jsonb,
    true
  ),
  (
    'naesin_set',
    '내신 종합세트',
    '내신 대비 객관식·서술형 혼합 13문항',
    '{"counts":{"title:en:high":1,"topic:en:high":1,"summary_mcq:na:default":1,"content_true:ko:high":1,"content_false:ko:high":1,"order:na:default":1,"sentence_blank:en:high":1,"irrelevant_sentence:na:high":1,"sentence_insertion:na:high":1,"grammar:na:high":1,"vocabulary:na:high":1,"summary_short:na:default":1,"writing:na:high":1}}'::jsonb,
    true
  ),
  (
    'grammar_vocab_focus',
    '어법·어휘 집중',
    '어법·어휘 난이도별 집중 8문항',
    '{"counts":{"grammar:na:low":1,"grammar:na:mid":2,"grammar:na:high":1,"vocabulary:na:low":1,"vocabulary:na:mid":2,"vocabulary:na:high":1}}'::jsonb,
    true
  ),
  (
    'writing_focus',
    '서술형 집중',
    '요약·영작·제목·주제 서술형 6문항',
    '{"counts":{"summary_short:na:default":1,"writing:na:mid":2,"writing:na:high":1,"short_title:na:default":1,"short_topic:na:default":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 026_question_generator_woojack_presets.sql ==========

-- 우작 11단계 스타일 시스템 프리셋
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'woojack_core',
    '11단계 핵심 세트',
    '내용불일치·양자택일·문장삽입·어법·어휘·빈칸·순서·주제·영작',
    '{"counts":{"content_false:ko:default":1,"grammar:na:default:binary":1,"sentence_insertion:na:default":1,"grammar:na:default:underline":1,"vocabulary:na:default":1,"summary_short:na:default":1,"order:na:default":1,"topic:ko:default":1,"sentence_blank:en:default":1,"writing:na:default":1}}'::jsonb,
    true
  ),
  (
    'woojack_objective',
    '객관식 집중',
    '내용·흐름·어법·어휘·주제·빈칸 객관식',
    '{"counts":{"content_false:ko:default":1,"sentence_insertion:na:default":1,"irrelevant_sentence:na:default":1,"grammar:na:default:underline":1,"vocabulary:na:default":1,"order:na:default":1,"topic:ko:default":1,"title:ko:default":1,"sentence_blank:en:default":1}}'::jsonb,
    true
  ),
  (
    'woojack_grammar_vocab',
    '어법·어휘 집중',
    '양자택일·어법·어휘·고쳐쓰기',
    '{"counts":{"grammar:na:default:binary":1,"grammar:na:default:underline":2,"vocabulary:na:default":2,"grammar:na:default:rewrite":1}}'::jsonb,
    true
  ),
  (
    'woojack_writing',
    '서술·빈칸 집중',
    '본문빈칸·영작',
    '{"counts":{"summary_short:na:default":2,"writing:na:default":2,"grammar:na:default:rewrite":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 027_question_generator_aingka_presets.sql ==========

-- 아잉카 모의고사 변형 스타일 시스템 프리셋
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus',
    'woojack_core',
    'woojack_objective',
    'woojack_grammar_vocab',
    'woojack_writing'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'aingka_core',
    '아잉카 핵심 변형',
    '내용일치·주제·제목·요지·빈칸·어법·어휘·순서·삽입·무관',
    '{"counts":{"content_true:ko:default:내용일치":1,"content_false:ko:default:내용불일치":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'aingka_main_idea',
    '대의 파악 집중',
    '주제·제목·요지·요약문',
    '{"counts":{"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  ),
  (
    'aingka_inference',
    '빈칸·배열 집중',
    '빈칸·순서·삽입·무관',
    '{"counts":{"sentence_blank:en:default:빈칸추론":2,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'aingka_grammar_vocab',
    '어법·어휘 집중',
    '어법·어휘 객관식',
    '{"counts":{"grammar:na:default:어법추론":2,"vocabulary:na:default:어휘추론":2}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 028_question_generator_seoul_presets.sql ==========

-- 서울시 학력평가 예상문제 스타일 시스템 프리셋
-- (목적·어법연결·연결어빈칸·내용불일치 영어선택지 등)

delete from public.question_generation_presets
where is_system = true
  and slug in (
    'aingka_main_idea',
    'aingka_inference',
    'aingka_grammar_vocab'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'seoul_section1',
    '서울시 Section ❶ 종합',
    '어법연결·연결어빈칸·목적·내용불일치·무관·빈칸 (1지문 6문항)',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1}}'::jsonb,
    true
  ),
  (
    'seoul_section2',
    '서울시 Section ❷ 종합',
    '어법·어휘·빈칸·주제·제목·요약 (1지문 6문항)',
    '{"counts":{"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"sentence_blank:en:default:빈칸추론":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  ),
  (
    'seoul_full',
    '서울시 통합 예상 (고난도)',
    'Section 구성에 가깝게 목적·불일치·어법·어휘·빈칸·순서·삽입·주제·제목·영작',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"underlined_inference:ko:default:함축의미추론":1,"writing:na:default:서술형영작":1}}'::jsonb,
    true
  ),
  (
    'aingka_core',
    '아잉카 핵심 변형',
    '내용일치·주제·제목·요지·빈칸·어법·어휘·순서·삽입·무관',
    '{"counts":{"content_true:en:default:내용일치":1,"content_false:en:default:내용불일치":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 029_question_generator_level_presets.sql ==========

-- 브랜드명 제거: 난이도·유형 중심 시스템 프리셋으로 교체
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'aingka_core',
    'aingka_main_idea',
    'aingka_inference',
    'aingka_grammar_vocab',
    'seoul_section1',
    'seoul_section2',
    'seoul_full',
    'woojack_core',
    'woojack_objective',
    'woojack_grammar_vocab',
    'woojack_writing',
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'standard_mixed',
    '표준 종합 (고1)',
    '고1 학력평가 수준 · 어법연결·연결어·목적·불일치·무관·빈칸',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1}}'::jsonb,
    true
  ),
  (
    'main_idea_focus',
    '대의·내용 집중',
    '주제·제목·요지·요약·내용일치·불일치',
    '{"counts":{"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1,"content_true:en:default:내용일치":1,"content_false:en:default:내용불일치":1}}'::jsonb,
    true
  ),
  (
    'blank_order_focus',
    '빈칸·배열 집중',
    '빈칸·연결어·순서·삽입·무관',
    '{"counts":{"sentence_blank:en:default:빈칸추론":2,"sentence_blank:en:default:연결어빈칸":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'grammar_vocab_focus',
    '어법·어휘 집중',
    '어법연결·어법·어휘·고쳐쓰기',
    '{"counts":{"grammar:en:default:어법연결":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"grammar:na:default:어법고쳐쓰기":1}}'::jsonb,
    true
  ),
  (
    'advanced_full',
    '고난도 통합',
    '학력평가 상위권 · 목적·불일치·어법·어휘·빈칸·순서·삽입·주제·함축·영작',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"underlined_inference:ko:default:함축의미추론":1,"writing:na:default:서술형영작":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 030_question_generator_main_idea_en.sql ==========

-- 대의파악: 주제·제목 영어 선택지 키로 갱신
update public.question_generation_presets
set
  name = '주제·제목 (대의)',
  description = '지문(상)+영어 선택지(하) · 주제·제목 각 1',
  config = '{"counts":{"topic:en:default:주제추론":1,"title:en:default:제목추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_focus';

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'main_idea_full',
    '대의 파악 전체',
    '주제·제목·요지·요약문',
    '{"counts":{"topic:en:default:주제추론":1,"title:en:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();




-- ========== 031_question_generator_difficulty_sangha.sql ==========

-- 대의파악: 난이도 상/하 · 영/한 선택 프리셋
update public.question_generation_presets
set
  name = '주제·제목 (대의)',
  description = '제목·주제 영어 난이도 상 각 1',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_focus';

update public.question_generation_presets
set
  name = '대의 파악 전체',
  description = '제목·주제(영 상) · 요지(상) · 요약문',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1,"summary_mcq:ko:high:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_full';




-- ========== 032_question_generator_drop_summary.sql ==========

-- 대의파악 프리셋에서 요약문 제거
update public.question_generation_presets
set
  name = '대의 파악 전체',
  description = '제목·주제(영 상) · 요지(상)',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1,"summary_mcq:ko:high:요지추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_full';




-- ========== 033_question_generator_scrub_summary.sql ==========

-- 모든 프리셋 config에서 요약문추론 키 제거
update public.question_generation_presets
set
  config = jsonb_set(
    config,
    '{counts}',
    (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      from jsonb_each(coalesce(config->'counts', '{}'::jsonb))
      where key not like '%요약문%'
    )
  ),
  description = replace(coalesce(description, ''), '·요약문', ''),
  updated_at = now()
where coalesce(config->'counts', '{}'::jsonb)::text like '%요약문%';

update public.question_generation_presets
set
  description = '제목·주제(영 상) · 요지(상)',
  updated_at = now()
where slug = 'main_idea_full';




-- ========== 034_question_generator_exam_vocab.sql ==========

-- 변형문제 보기 어려운 단어 → 해설지 + 단어학습(QR) 연동

alter table public.generated_english_questions
  add column if not exists hard_words jsonb not null default '[]'::jsonb;

comment on column public.generated_english_questions.hard_words is
  '문항별 보기/지문 고난도 단어 [{word, meaning}]';

alter table public.question_generation_jobs
  add column if not exists vocab_set_id uuid references public.vocab_sets(id) on delete set null;

create index if not exists question_generation_jobs_vocab_set_id_idx
  on public.question_generation_jobs(vocab_set_id);

alter table public.vocab_sets
  add column if not exists exam_compact boolean not null default false;

alter table public.vocab_sets
  add column if not exists source_job_id uuid;

comment on column public.vocab_sets.exam_compact is
  'true면 1·2·4단계만 (예문 빈칸 3단계 생략)';

comment on column public.vocab_sets.source_job_id is
  '변형문제 생성 job id (QR 학습용)';

create index if not exists vocab_sets_source_job_id_idx
  on public.vocab_sets(source_job_id)
  where source_job_id is not null;



