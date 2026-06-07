-- 학생부 분석 보고서 공개 링크 (token 기반, API에서 service role로만 접근)

create table public.shared_student_records (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  student_id uuid references public.profiles(id) on delete set null,
  student_name text not null,
  html text not null,
  generated_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index shared_student_records_token_idx on public.shared_student_records(token);
create index shared_student_records_expires_at_idx on public.shared_student_records(expires_at);

alter table public.shared_student_records enable row level security;
