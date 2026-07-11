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
