-- 우작 11단계 스타일 시스템 프리셋
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'woojack_core',
    '11단계 핵심 세트',
    '내용불일치·양자택일·문장삽입·어법·어휘·빈칸·순서·주제·영작',
    '{"counts":{"content_false:ko:default":1,"grammar:na:default:binary":1,"sentence_insertion:na:default":1,"grammar:na:default:underline":1,"vocabulary:na:default":1,"summary_short:na:default":1,"order:na:default":1,"topic:ko:default":1,"sentence_blank:en:default":1,"writing:na:default":1}}'::jsonb,
    true
  ),
  (
    'woojack_objective',
    '객관식 집중',
    '내용·흐름·어법·어휘·주제·빈칸 객관식',
    '{"counts":{"content_false:ko:default":1,"sentence_insertion:na:default":1,"irrelevant_sentence:na:default":1,"grammar:na:default:underline":1,"vocabulary:na:default":1,"order:na:default":1,"topic:ko:default":1,"title:ko:default":1,"sentence_blank:en:default":1}}'::jsonb,
    true
  ),
  (
    'woojack_grammar_vocab',
    '어법·어휘 집중',
    '양자택일·어법·어휘·고쳐쓰기',
    '{"counts":{"grammar:na:default:binary":1,"grammar:na:default:underline":2,"vocabulary:na:default":2,"grammar:na:default:rewrite":1}}'::jsonb,
    true
  ),
  (
    'woojack_writing',
    '서술·빈칸 집중',
    '본문빈칸·영작',
    '{"counts":{"summary_short:na:default":2,"writing:na:default":2,"grammar:na:default:rewrite":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();
