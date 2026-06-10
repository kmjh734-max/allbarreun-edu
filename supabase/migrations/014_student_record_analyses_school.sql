-- 분석 기록에 학교명 표시용 컬럼 추가

alter table public.student_record_analyses
  add column if not exists school text;
