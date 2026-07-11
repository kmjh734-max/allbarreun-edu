import { emptyCounts } from "@/lib/question-generator/question-types";
import type { PresetConfig } from "@/lib/question-generator/types";

function withCounts(entries: Array<[string, number]>): PresetConfig {
  const counts = emptyCounts();
  for (const [key, n] of entries) {
    if (key in counts) counts[key] = n;
  }
  return { counts };
}

/**
 * 고1 학력평가(3월) 수준의 난이도·유형 프리셋
 * (브랜드명 없이 유형·난이도만 표기)
 */
export const SYSTEM_PRESETS: Array<{
  slug: string;
  name: string;
  description: string;
  config: PresetConfig;
}> = [
  {
    slug: "standard_mixed",
    name: "표준 종합 (고1)",
    description:
      "고1 학력평가 수준 · 어법·연결어·목적·불일치·무관·빈칸",
    config: withCounts([
      ["grammar:na:default:어법모두고르기", 1],
      ["sentence_blank:en:default:연결어빈칸", 1],
      ["underlined_inference:en:default:목적추론", 1],
      ["content_false:en:high:내용불일치", 1],
      ["irrelevant_sentence:na:low:무관한문장", 1],
      ["sentence_blank:en:low:빈칸추론", 1],
    ]),
  },
  {
    slug: "main_idea_focus",
    name: "주제·제목 (대의)",
    description: "제목·주제 영어 난이도 상 각 1",
    config: withCounts([
      ["title:en:high:제목추론", 1],
      ["topic:en:high:주제추론", 1],
    ]),
  },
  {
    slug: "main_idea_full",
    name: "대의 파악 전체",
    description: "제목·주제(영 상) · 요지(상)",
    config: withCounts([
      ["title:en:high:제목추론", 1],
      ["topic:en:high:주제추론", 1],
      ["summary_mcq:ko:high:요지추론", 1],
    ]),
  },
  {
    slug: "blank_order_focus",
    name: "빈칸·배열 집중",
    description: "빈칸·순서·삽입·무관 (하/상)",
    config: withCounts([
      ["sentence_blank:en:low:빈칸추론", 1],
      ["sentence_blank:en:high:빈칸추론", 1],
      ["order:na:low:순서추론", 1],
      ["order:na:high:순서추론", 1],
      ["sentence_insertion:na:low:문장삽입", 1],
      ["sentence_insertion:na:high:문장삽입", 1],
      ["irrelevant_sentence:na:low:무관한문장", 1],
      ["irrelevant_sentence:na:high:무관한문장", 1],
    ]),
  },
  {
    slug: "grammar_vocab_focus",
    name: "어법·어휘 집중",
    description: "어법 모두/개수 · 어휘 고르기/개수",
    config: withCounts([
      ["grammar:na:default:어법모두고르기", 1],
      ["grammar:na:default:어법개수", 1],
      ["vocabulary:na:default:어휘추론", 1],
      ["vocabulary:na:default:어휘개수", 1],
    ]),
  },
  {
    slug: "advanced_full",
    name: "고난도 통합",
    description:
      "학력평가 상위권 · 목적·불일치·어법·어휘·빈칸·순서·삽입·주제·함축·제시어배열",
    config: withCounts([
      ["grammar:na:default:어법모두고르기", 1],
      ["grammar:na:default:어법개수", 1],
      ["vocabulary:na:default:어휘추론", 1],
      ["vocabulary:na:default:어휘개수", 1],
      ["sentence_blank:en:default:연결어빈칸", 1],
      ["underlined_inference:en:default:목적추론", 1],
      ["content_false:en:high:내용불일치", 1],
      ["irrelevant_sentence:na:high:무관한문장", 1],
      ["sentence_blank:en:high:빈칸추론", 1],
      ["order:na:high:순서추론", 1],
      ["sentence_insertion:na:high:문장삽입", 1],
      ["topic:en:high:주제추론", 1],
      ["title:en:high:제목추론", 1],
      ["underlined_inference:en:default:함축의미추론", 1],
      ["writing:na:default:제시어배열기본", 1],
    ]),
  },
];
