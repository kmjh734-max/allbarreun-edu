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
