-- 모든 프리셋 config에서 요약문추론 키 제거
update public.question_generation_presets
set
  config = jsonb_set(
    config,
    '{counts}',
    (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      from jsonb_each(coalesce(config->'counts', '{}'::jsonb))
      where key not like '%요약문%'
    )
  ),
  description = replace(coalesce(description, ''), '·요약문', ''),
  updated_at = now()
where coalesce(config->'counts', '{}'::jsonb)::text like '%요약문%';

update public.question_generation_presets
set
  description = '제목·주제(영 상) · 요지(상)',
  updated_at = now()
where slug = 'main_idea_full';
