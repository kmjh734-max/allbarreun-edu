-- Watch position tracking for auto-completion (90% threshold)

alter table public.lesson_progress
  add column if not exists watched_seconds integer not null default 0;

alter table public.lesson_progress
  add column if not exists progress_percent integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_progress_progress_percent_range'
      and conrelid = 'public.lesson_progress'::regclass
  ) then
    alter table public.lesson_progress
      add constraint lesson_progress_progress_percent_range
      check (progress_percent >= 0 and progress_percent <= 100);
  end if;
end $$;
