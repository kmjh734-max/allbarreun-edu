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
