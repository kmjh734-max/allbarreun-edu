-- 대의파악 프리셋에서 요약문 제거
update public.question_generation_presets
set
  name = '대의 파악 전체',
  description = '제목·주제(영 상) · 요지(상)',
  config = '{"counts":{"title:en:high:제목추론":1,"topic:en:high:주제추론":1,"summary_mcq:ko:high:요지추론":1}}'::jsonb,
  updated_at = now()
where slug = 'main_idea_full';
