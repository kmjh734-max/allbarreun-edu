-- 프로덕션 Supabase SQL Editor에서 한 번 실행
-- 오류: Could not find the 'video_provider' column of 'lessons' in the schema cache

alter table public.lessons
  add column if not exists video_provider text not null default 'vimeo';

alter table public.lessons
  add column if not exists youtube_url text;

alter table public.lessons
  add column if not exists youtube_video_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lessons_video_provider_check'
      and conrelid = 'public.lessons'::regclass
  ) then
    alter table public.lessons
      add constraint lessons_video_provider_check
      check (video_provider in ('vimeo', 'youtube'));
  end if;
end $$;

update public.lessons
set video_provider = 'vimeo'
where video_provider is null or video_provider = '';
