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
