-- 서울시 학력평가 예상문제 스타일 시스템 프리셋
-- (목적·어법연결·연결어빈칸·내용불일치 영어선택지 등)

delete from public.question_generation_presets
where is_system = true
  and slug in (
    'aingka_main_idea',
    'aingka_inference',
    'aingka_grammar_vocab'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'seoul_section1',
    '서울시 Section ❶ 종합',
    '어법연결·연결어빈칸·목적·내용불일치·무관·빈칸 (1지문 6문항)',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1}}'::jsonb,
    true
  ),
  (
    'seoul_section2',
    '서울시 Section ❷ 종합',
    '어법·어휘·빈칸·주제·제목·요약 (1지문 6문항)',
    '{"counts":{"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"sentence_blank:en:default:빈칸추론":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요약문추론":1}}'::jsonb,
    true
  ),
  (
    'seoul_full',
    '서울시 통합 예상 (고난도)',
    'Section 구성에 가깝게 목적·불일치·어법·어휘·빈칸·순서·삽입·주제·제목·영작',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"underlined_inference:ko:default:함축의미추론":1,"writing:na:default:서술형영작":1}}'::jsonb,
    true
  ),
  (
    'aingka_core',
    '아잉카 핵심 변형',
    '내용일치·주제·제목·요지·빈칸·어법·어휘·순서·삽입·무관',
    '{"counts":{"content_true:en:default:내용일치":1,"content_false:en:default:내용불일치":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();
