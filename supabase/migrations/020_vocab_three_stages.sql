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
