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

-- 링크만 있고 ID가 비어 있으면 재생 화면에 "등록된 동영상이 없습니다"가 뜰 수 있음
update public.lessons
set
  youtube_video_id = coalesce(
    youtube_video_id,
    (regexp_match(youtube_url, 'v=([a-zA-Z0-9_-]{11})'))[1],
    (regexp_match(youtube_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1],
    (regexp_match(youtube_url, 'embed/([a-zA-Z0-9_-]{11})'))[1]
  ),
  video_provider = 'youtube'
where youtube_url is not null
  and youtube_url <> ''
  and (youtube_video_id is null or youtube_video_id = '');

update public.lessons
set
  vimeo_video_id = coalesce(
    vimeo_video_id,
    (regexp_match(vimeo_url, 'vimeo\.com/(?:video/)?([0-9]+)'))[1]
  ),
  video_provider = 'vimeo'
where vimeo_url is not null
  and vimeo_url <> ''
  and vimeo_url not ilike '%youtube%'
  and vimeo_url not ilike '%youtu.be%'
  and (vimeo_video_id is null or vimeo_video_id = '');

-- YouTube 링크가 vimeo_url 컬럼에만 들어간 경우
update public.lessons
set
  youtube_url = coalesce(youtube_url, vimeo_url),
  youtube_video_id = coalesce(
    youtube_video_id,
    (regexp_match(vimeo_url, 'v=([a-zA-Z0-9_-]{11})'))[1],
    (regexp_match(vimeo_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1]
  ),
  video_provider = 'youtube',
  vimeo_url = null,
  vimeo_video_id = null
where vimeo_url is not null
  and (vimeo_url ilike '%youtube%' or vimeo_url ilike '%youtu.be%');

notify pgrst, 'reload schema';
