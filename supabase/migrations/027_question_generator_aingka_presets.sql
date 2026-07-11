-- 아잉카 모의고사 변형 스타일 시스템 프리셋
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus',
    'woojack_core',
    'woojack_objective',
    'woojack_grammar_vocab',
    'woojack_writing'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'aingka_core',
    '아잉카 핵심 변형',
    '내용일치·주제·제목·요지·빈칸·어법·어휘·순서·삽입·무관',
    '{"counts":{"content_true:ko:default:내용일치":1,"content_false:ko:default:내용불일치":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'aingka_main_idea',
    '대의 파악 집중',
    '주제·제목·요지·요약문',
    '{"counts":{"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  ),
  (
    'aingka_inference',
    '빈칸·배열 집중',
    '빈칸·순서·삽입·무관',
    '{"counts":{"sentence_blank:en:default:빈칸추론":2,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'aingka_grammar_vocab',
    '어법·어휘 집중',
    '어법·어휘 객관식',
    '{"counts":{"grammar:na:default:어법추론":2,"vocabulary:na:default:어휘추론":2}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();
