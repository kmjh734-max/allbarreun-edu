-- 학생부 분석 기록 (API에서 service role로만 접근)

create table public.student_record_analyses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  student_name text not null,
  html text not null,
  generated_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index student_record_analyses_created_by_idx
  on public.student_record_analyses(created_by);
create index student_record_analyses_created_at_idx
  on public.student_record_analyses(created_at desc);

alter table public.student_record_analyses enable row level security;
