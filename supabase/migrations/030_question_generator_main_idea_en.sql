-- 대의파악: 주제·제목 영어 선택지 키로 갱신
update public.question_generation_presets
set
  name = '주제·제목 (대의)',
  description = '지문(상)+영어 선택지(하) · 주제·제목 각 1',
  config = '{"counts":{"topic:en:default:주제추론":1,"title:en:default:제목추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_focus';

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'main_idea_full',
    '대의 파악 전체',
    '주제·제목·요지·요약문',
    '{"counts":{"topic:en:default:주제추론":1,"title:en:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();
