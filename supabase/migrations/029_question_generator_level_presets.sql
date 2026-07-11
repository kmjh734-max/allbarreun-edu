-- 브랜드명 제거: 난이도·유형 중심 시스템 프리셋으로 교체
delete from public.question_generation_presets
where is_system = true
  and slug in (
    'aingka_core',
    'aingka_main_idea',
    'aingka_inference',
    'aingka_grammar_vocab',
    'seoul_section1',
    'seoul_section2',
    'seoul_full',
    'woojack_core',
    'woojack_objective',
    'woojack_grammar_vocab',
    'woojack_writing',
    'basic_set',
    'naesin_set',
    'grammar_vocab_focus',
    'writing_focus'
  );

insert into public.question_generation_presets (slug, name, description, config, is_system)
values
  (
    'standard_mixed',
    '표준 종합 (고1)',
    '고1 학력평가 수준 · 어법연결·연결어·목적·불일치·무관·빈칸',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1}}'::jsonb,
    true
  ),
  (
    'main_idea_focus',
    '대의·내용 집중',
    '주제·제목·요지·요약·내용일치·불일치',
    '{"counts":{"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"summary_mcq:ko:default:요지추론":1,"summary_mcq:ko:default:요약문추론":1,"content_true:en:default:내용일치":1,"content_false:en:default:내용불일치":1}}'::jsonb,
    true
  ),
  (
    'blank_order_focus',
    '빈칸·배열 집중',
    '빈칸·연결어·순서·삽입·무관',
    '{"counts":{"sentence_blank:en:default:빈칸추론":2,"sentence_blank:en:default:연결어빈칸":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"irrelevant_sentence:na:default:무관한문장":1}}'::jsonb,
    true
  ),
  (
    'grammar_vocab_focus',
    '어법·어휘 집중',
    '어법연결·어법·어휘·고쳐쓰기',
    '{"counts":{"grammar:en:default:어법연결":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"grammar:na:default:어법고쳐쓰기":1}}'::jsonb,
    true
  ),
  (
    'advanced_full',
    '고난도 통합',
    '학력평가 상위권 · 목적·불일치·어법·어휘·빈칸·순서·삽입·주제·함축·영작',
    '{"counts":{"grammar:en:default:어법연결":1,"sentence_blank:en:default:연결어빈칸":1,"underlined_inference:en:default:목적추론":1,"content_false:en:default:내용불일치":1,"irrelevant_sentence:na:default:무관한문장":1,"sentence_blank:en:default:빈칸추론":1,"grammar:na:default:어법추론":1,"vocabulary:na:default:어휘추론":1,"order:na:default:순서추론":1,"sentence_insertion:na:default:문장삽입":1,"topic:ko:default:주제추론":1,"title:ko:default:제목추론":1,"underlined_inference:ko:default:함축의미추론":1,"writing:na:default:서술형영작":1}}'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  is_system = true,
  updated_at = now();
