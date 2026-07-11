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
