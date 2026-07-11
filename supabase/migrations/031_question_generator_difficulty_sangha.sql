-- 대의파악: 난이도 상/하 · 영/한 선택 프리셋
update public.question_generation_presets
set
  name = '주제·제목 (대의)',
  description = '제목·주제 영어 난이도 상 각 1',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_focus';

update public.question_generation_presets
set
  name = '대의 파악 전체',
  description = '제목·주제(영 상) · 요지(상) · 요약문',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1,"summary_mcq:ko:high:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_full';
