/**
 * 제시어 배열 — 『고등영어 어법서술형』(교사용 2판3쇄) GRAMMAR POINT 01–15
 *
 * 목표: 문항마다 다른 POINT·구문을 강제해, 단순 SVO 한 문장 반복을 막음.
 * 빈칸 대상은 지문의 핵심·중요 문장(또는 그에 맞게 다듬은 한 문장/절).
 */

export const WORD_ORDER_TEXTBOOK =
  "고등영어 어법서술형 (GRAMMAR POINT 01–15)" as const;

export type WordOrderMode = "basic" | "inflect" | "add";

export type WordOrderCase = {
  id: string;
  /** 기본(어형 고정) / 어형변화 / 단어추가 중 적합한 모드 */
  modes: WordOrderMode[];
  name: string;
  koLabel: string;
  /** 교재식 출제 요지 */
  mechanism: string;
  /** 지문에서 무엇을 빈칸으로 뽑을지 */
  target: string;
  /** <보기> 구성 힌트 */
  wordBank: string;
  /** 정답 형태 예 (교재 스타일) */
  example: string;
  /** 해설 한 줄 */
  koTip: string;
};

export type WordOrderPoint = {
  point: number;
  title: string;
  subtitle: string;
  cases: WordOrderCase[];
};

export const WORD_ORDER_POINTS: WordOrderPoint[] = [
  {
    point: 1,
    title: "동사의 시제와 태",
    subtitle: "시제·수동태에 맞는 어순 배열",
    cases: [
      {
        id: "gp01-perfect",
        modes: ["basic", "inflect"],
        name: "현재완료·과거완료 주절",
        koLabel: "시제(완료)",
        mechanism: "Since/~ for / by then 등 단서 → have/has/had + p.p. + 수 일치",
        target: "지문 핵심 주장·사실 문장 중 ‘~해 왔다/해 왔다’ 의미 구간",
        wordBank: "주어 / have|has / 동사원형 / of / this / trick 등 본문 핵심어",
        example: "shopkeepers have taken advantage of this trick",
        koTip: "완료 시제 단서와 주어 수에 맞춰 have/has + p.p.로 배열하세요.",
      },
      {
        id: "gp01-future-perfect",
        modes: ["inflect"],
        name: "미래완료 will have p.p.",
        koLabel: "시제(미래완료)",
        mechanism: "by ten years / by then 등 → will have + p.p.",
        target: "목표·결과 예고 문장",
        wordBank: "you / achieve / your / goals → will have achieved …",
        example: "you will have achieved your goals",
        koTip: "미래 시점까지의 완성은 will have + p.p.입니다.",
      },
      {
        id: "gp01-passive",
        modes: ["inflect", "add"],
        name: "수동태 전환·배열",
        koLabel: "태(수동)",
        mechanism: "be + p.p. (+ by 행위자). 목적어를 주어로",
        target: "행위자보다 결과가 중요한 핵심 문장",
        wordBank: "were / given / instructions / by / him 또는 to them",
        example: "Instructions were given to them by him",
        koTip: "수동은 be + p.p.이고, give류는 to + 간접목적어에 주의하세요.",
      },
      {
        id: "gp01-time-clause",
        modes: ["basic", "inflect"],
        name: "시간·조건 부사절 = 현재형",
        koLabel: "시제(부사절)",
        mechanism: "when/if/as soon as 절은 미래 뜻도 현재형",
        target: "조건·시간 절이 있는 중요 문장",
        wordBank: "when / the desk / arrive / we / telephone …",
        example: "As soon as the desk arrives, we will telephone you",
        koTip: "시간·조건 부사절에서는 will 대신 현재형을 씁니다.",
      },
    ],
  },
  {
    point: 2,
    title: "조동사",
    subtitle: "조동사 + have p.p. · 단어 추가 배열",
    cases: [
      {
        id: "gp02-should-have",
        modes: ["inflect", "add"],
        name: "should/must/may + have p.p.",
        koLabel: "조동사+완료",
        mechanism: "후회·추측·의무의 과거 → 조동사 + have + p.p. (한 단어 추가 유형 포함)",
        target: "과거 사건 평가·후회·추측이 드러나는 문장",
        wordBank: "that / was / the take / he / put on / TV + should",
        example: "that was the take he should have put on TV",
        koTip: "과거 후회·추측은 조동사 + have + p.p. 어순입니다.",
      },
      {
        id: "gp02-modal-prog",
        modes: ["inflect"],
        name: "should have been -ing",
        koLabel: "조동사+진행",
        mechanism: "과거에 했어야 할 진행 상태",
        target: "정상 기능·당위적 상태 서술",
        wordBank: "how / they / should / have / been / functioning",
        example: "how they should have been functioning",
        koTip: "진행 완료 추측·후회는 have been + -ing입니다.",
      },
      {
        id: "gp02-modal-bare",
        modes: ["basic"],
        name: "조동사 + 동사원형 (어형 고정)",
        koLabel: "조동사+원형",
        mechanism: "can/must/will + V (이미 맞는 형태를 보기에)",
        target: "의무·가능·의지 핵심 절",
        wordBank: "students / must / respect / evidence (변화 없이 배열)",
        example: "students must respect evidence",
        koTip: "조동사 뒤에는 동사원형을 그대로 배열합니다.",
      },
    ],
  },
  {
    point: 3,
    title: "to부정사",
    subtitle: "to-v / so~that / enough to 전환·배열",
    cases: [
      {
        id: "gp03-so-that",
        modes: ["inflect", "add"],
        name: "so + adj/adv + that + S + can + V",
        koLabel: "to부정사·결과",
        mechanism: "enough to / too ~ to ↔ so ~ that 전환 배열",
        target: "정도·결과 관계가 있는 핵심 문장",
        wordBank: "so / adj / that / subject / can / verb",
        example: "so longstanding that people can hardly question it",
        koTip: "so + 형·부 + that + 절 어순을 지키세요.",
      },
      {
        id: "gp03-for-to",
        modes: ["inflect"],
        name: "for + 의미상 주어 + to-v",
        koLabel: "to부정사 의미상 주어",
        mechanism: "It is adj for sb to V / for + O + to-v",
        target: "평가·당위가 있는 문장",
        wordBank: "for / us / to / understand / the claim",
        example: "for us to understand the claim",
        koTip: "의미상 주어는 for + 목적격 + to부정사입니다.",
      },
      {
        id: "gp03-to-perfect",
        modes: ["inflect"],
        name: "to have p.p. (완료부정사)",
        koLabel: "to부정사 시제",
        mechanism: "주절보다 이전 동작 → to have + p.p.",
        target: "이전 완료를 나타내는 목적·결과 구문",
        wordBank: "to / have / completed / the task",
        example: "to have completed the task",
        koTip: "주절보다 앞선 일은 to have + p.p.로 씁니다.",
      },
    ],
  },
  {
    point: 4,
    title: "동명사",
    subtitle: "동명사 목적어·관용·시제·태",
    cases: [
      {
        id: "gp04-gerund-obj",
        modes: ["inflect"],
        name: "동사/전치사 + 동명사",
        koLabel: "동명사",
        mechanism: "enjoy/avoid/by/without + V-ing",
        target: "습관·수단·회피가 드러나는 문장",
        wordBank: "by / testing / ideas / carefully",
        example: "by testing ideas carefully",
        koTip: "전치사·특정 동사 뒤에는 동명사(-ing)입니다.",
      },
      {
        id: "gp04-gerund-perfect",
        modes: ["inflect"],
        name: "having p.p. / being p.p.",
        koLabel: "동명사 시제·태",
        mechanism: "이전·수동 의미의 동명사",
        target: "원인·경험이 앞선 동작인 문장",
        wordBank: "having / been / told / the truth",
        example: "having been told the truth",
        koTip: "앞선 수동 경험은 having been + p.p.로 배열합니다.",
      },
    ],
  },
  {
    point: 5,
    title: "분사구문",
    subtitle: "분사구문 형태·시제·태 배열",
    cases: [
      {
        id: "gp05-participle",
        modes: ["inflect"],
        name: "V-ing / Having p.p. 분사구문",
        koLabel: "분사구문",
        mechanism: "주절과 시제 같으면 V-ing, 이전이면 Having p.p.",
        target: "부사절을 줄인 원인·시간 절",
        wordBank: "graduating / from / college / he / started …",
        example: "Graduating from college, he started his career",
        koTip: "주절과 같은 시제는 현재분사, 이전이면 Having + p.p.입니다.",
      },
      {
        id: "gp05-passive-part",
        modes: ["inflect"],
        name: "수동 분사구문 being/p.p.",
        koLabel: "분사구문(수동)",
        mechanism: "수동 의미 → Being p.p. 또는 p.p.",
        target: "수동 상황·영향 문장",
        wordBank: "being / watched / by / the audience",
        example: "Being watched by the audience, he felt nervous",
        koTip: "수동 분사구문은 being + p.p. 형태를 확인하세요.",
      },
    ],
  },
  {
    point: 6,
    title: "주의해야 할 분사구문",
    subtitle: "with + O + 분사 · 독립분사구문",
    cases: [
      {
        id: "gp06-with",
        modes: ["inflect", "add"],
        name: "with + 목적어 + 분사",
        koLabel: "with 분사구문",
        mechanism: "with + O + V-ing/p.p. (능동/수동)",
        target: "부대상황·결과 묘사 문장",
        wordBank: "with / his / arms / folded / across / his / chest",
        example: "with his arms folded across his chest",
        koTip: "with 구문은 목적어 뒤 분사(능동 -ing / 수동 p.p.) 어순입니다.",
      },
      {
        id: "gp06-absolute",
        modes: ["inflect"],
        name: "독립분사구문 (S + V-ing/p.p.)",
        koLabel: "독립분사구문",
        mechanism: "주절 주어와 다른 주어 + 분사",
        target: "배경·조건이 다른 주어로 서술된 문장",
        wordBank: "the / weather / being / fine / we / went out",
        example: "The weather being fine, we went out",
        koTip: "주어가 다르면 ‘주어 + 분사’ 독립분사구문으로 배열합니다.",
      },
    ],
  },
  {
    point: 7,
    title: "상관 접속사·명사절 접속사",
    subtitle: "both A and B / whether A or B / that절 배열",
    cases: [
      {
        id: "gp07-correlative",
        modes: ["basic", "inflect"],
        name: "both A and B / not only A but also B / either~or",
        koLabel: "상관접속사",
        mechanism: "A/B 병렬 구조 대칭 배열",
        target: "두 요소를 대등하게 묶는 핵심 주장",
        wordBank: "not / only / evidence / but / also / testing",
        example: "not only evidence but also testing",
        koTip: "상관접속사는 A와 B의 품사·구조가 나란해야 합니다.",
      },
      {
        id: "gp07-whether",
        modes: ["basic", "inflect"],
        name: "whether A or B",
        koLabel: "명사절 whether",
        mechanism: "whether … or … 절 배치",
        target: "선택·불확실성을 나타내는 문장",
        wordBank: "whether / the / claim / is / true / or / false",
        example: "whether the claim is true or false",
        koTip: "whether A or B에서 or 앞뒤를 대칭으로 배열하세요.",
      },
      {
        id: "gp07-that-clause",
        modes: ["basic", "inflect"],
        name: "that 명사절",
        koLabel: "명사절 that",
        mechanism: "동사/형용사 뒤 that + S + V",
        target: "주장·사실 내용절",
        wordBank: "that / objective / truth / matters",
        example: "that objective truth matters",
        koTip: "that절은 접속사 + 주어 + 동사 순입니다.",
      },
    ],
  },
  {
    point: 8,
    title: "부사절 접속사",
    subtitle: "시간·조건·양보 부사절 영작·배열",
    cases: [
      {
        id: "gp08-condition",
        modes: ["inflect", "add"],
        name: "unless / provided that / as long as / in case",
        koLabel: "조건 부사절",
        mechanism: "조건 접속사 + 현재형 (미래 뜻)",
        target: "조건·대비가 핵심인 문장",
        wordBank: "in / case / she / is / late + be able to …",
        example: "In case she is late, we should wait",
        koTip: "조건 부사절은 현재형으로 미래를 나타냅니다.",
      },
      {
        id: "gp08-concession",
        modes: ["basic", "inflect"],
        name: "even though / while / although",
        koLabel: "양보 부사절",
        mechanism: "양보·대조 접속사 절 배열",
        target: "대조가 드러나는 중요 문장",
        wordBank: "even / though / the / theory / seems / plausible",
        example: "even though the theory seems plausible",
        koTip: "양보 접속사 뒤는 완전한 절(S+V)로 배열합니다.",
      },
    ],
  },
  {
    point: 9,
    title: "관계대명사",
    subtitle: "관계대명사 구문 어순 배열",
    cases: [
      {
        id: "gp09-rel-obj",
        modes: ["basic", "inflect"],
        name: "목적격 관계대명사 (생략 가능)",
        koLabel: "관계대명사",
        mechanism: "선행사 + (whom/which/that) + S + V",
        target: "선행사를 수식하는 핵심 정보 절",
        wordBank: "which / they / can / take / home",
        example: "which they can take home",
        koTip: "목적격 관계사는 생략 가능하지만, 쓰면 선행사 바로 뒤에 둡니다.",
      },
      {
        id: "gp09-rel-subj",
        modes: ["inflect"],
        name: "주격 관계대명사 + 수일치",
        koLabel: "관계대명사(주격)",
        mechanism: "선행사 수 = 관계절 동사 수",
        target: "정의·특성 서술 문장",
        wordBank: "that / enable / us / to / move",
        example: "homes that enable us to move",
        koTip: "주격 관계절 동사는 선행사 수에 맞춥니다.",
      },
      {
        id: "gp09-rel-insert",
        modes: ["inflect"],
        name: "삽입 절 they thought / I believe",
        koLabel: "관계대명사 삽입",
        mechanism: "관계절 안 삽입어구 배열",
        target: "평가·인식이 끼어 있는 문장",
        wordBank: "that / they / thought / was / the / most / attractive",
        example: "that they thought was the most attractive",
        koTip: "삽입구(they thought)는 관계사와 be동사 사이에 둡니다.",
      },
    ],
  },
  {
    point: 10,
    title: "관계부사·복합관계사",
    subtitle: "where/when/why · whatever 배열",
    cases: [
      {
        id: "gp10-rel-adv",
        modes: ["basic", "inflect"],
        name: "관계부사 where/when/why",
        koLabel: "관계부사",
        mechanism: "장소·시간·이유 선행사 + 관계부사 + 절",
        target: "장소·시점·이유가 핵심인 문장",
        wordBank: "where / evidence / can / be / tested",
        example: "where evidence can be tested",
        koTip: "관계부사 뒤에는 주어+동사 절이 이어집니다.",
      },
      {
        id: "gp10-compound",
        modes: ["inflect", "add"],
        name: "whatever / wherever / however",
        koLabel: "복합관계사",
        mechanism: "복합관계사 + 절 (양보·자유선택)",
        target: "어떤 ~이든 양보·포괄 문장",
        wordBank: "whatever / the / cost / may / be",
        example: "whatever the cost may be",
        koTip: "복합관계사는 접속사 역할과 선행사 역할을 함께 합니다.",
      },
    ],
  },
  {
    point: 11,
    title: "가정법",
    subtitle: "가정법 과거·과거완료 / as if / I wish",
    cases: [
      {
        id: "gp11-past",
        modes: ["inflect"],
        name: "가정법 과거 If + 과거, would + V",
        koLabel: "가정법 과거",
        mechanism: "현재 반대 사실",
        target: "현실과 반대인 가정·제안",
        wordBank: "If / evidence / were / ignored / science / would / fail",
        example: "If evidence were ignored, science would fail",
        koTip: "가정법 과거는 if절 과거(+were), 주절 would + 원형입니다.",
      },
      {
        id: "gp11-past-perf",
        modes: ["inflect", "add"],
        name: "가정법 과거완료 had p.p., would have p.p.",
        koLabel: "가정법 과거완료",
        mechanism: "과거 반대 사실",
        target: "과거 선택·결과에 대한 가정",
        wordBank: "had / they / tested / it / earlier / they / would / have / known",
        example: "Had they tested it earlier, they would have known",
        koTip: "과거 반대는 had + p.p. / would have + p.p. 어순입니다.",
      },
      {
        id: "gp11-as-if",
        modes: ["inflect"],
        name: "as if / I wish 가정법",
        koLabel: "as if·I wish",
        mechanism: "as if + 과거/과거완료, I wish + 가정",
        target: "비유·유감 표현 문장",
        wordBank: "as / if / it / were / already / proven",
        example: "as if it were already proven",
        koTip: "as if·wish 뒤는 가정법 시제를 씁니다.",
      },
    ],
  },
  {
    point: 12,
    title: "5형식 / 가주어·가목적어 it",
    subtitle: "V + O + to-v / It is … to-v",
    cases: [
      {
        id: "gp12-5form",
        modes: ["basic", "inflect"],
        name: "5형식 enable/force/allow + O + to-v",
        koLabel: "5형식",
        mechanism: "동사 + 목적어 + to부정사(보어)",
        target: "사역·허용·가능하게 함이 핵심인 문장",
        wordBank: "enable / us / to / move / freely",
        example: "enable us to move freely",
        koTip: "5형식은 동사 + 목적어 + to부정사 순입니다.",
      },
      {
        id: "gp12-it-subject",
        modes: ["inflect", "add"],
        name: "가주어 it … to-v / that",
        koLabel: "가주어 it",
        mechanism: "It is adj (for sb) to V / that S V",
        target: "평가·중요성 진술",
        wordBank: "It / is / essential / to / respect / evidence",
        example: "It is essential to respect evidence",
        koTip: "긴 주어는 it으로 받고 진주어(to-v/that)를 뒤에 둡니다.",
      },
    ],
  },
  {
    point: 13,
    title: "도치·강조·생략",
    subtitle: "부정 부사 도치 · It is ~ that 강조",
    cases: [
      {
        id: "gp13-inversion",
        modes: ["inflect", "add"],
        name: "부정·제한 부사 도치",
        koLabel: "도치",
        mechanism: "Never/Only then + 조동사 + S + V",
        target: "강조·강한 부정이 있는 문장",
        wordBank: "Only / then / can / we / trust / the / result",
        example: "Only then can we trust the result",
        koTip: "부정·제한 부사가 문두이면 조동사/be가 주어 앞으로 갑니다.",
      },
      {
        id: "gp13-cleft",
        modes: ["basic", "inflect"],
        name: "It is ~ that 강조 구문",
        koLabel: "강조 구문",
        mechanism: "It is + 강조요소 + that + 나머지",
        target: "원인·주어·부사구를 강조할 문장",
        wordBank: "It / is / testing / that / confirms / the / claim",
        example: "It is testing that confirms the claim",
        koTip: "강조 구문은 It is … that … 틀을 유지하세요.",
      },
    ],
  },
  {
    point: 14,
    title: "비교",
    subtitle: "원급·비교급·최상급 배열",
    cases: [
      {
        id: "gp14-as-as",
        modes: ["basic", "inflect"],
        name: "as … as 원급 비교",
        koLabel: "원급 비교",
        mechanism: "as + adj/adv + as",
        target: "동등 비교가 핵심인 문장",
        wordBank: "as / likely / to / fail / as / to / succeed",
        example: "as likely to fail as to succeed",
        koTip: "원급은 as + 형·부 + as 어순입니다.",
      },
      {
        id: "gp14-comparative",
        modes: ["inflect", "add"],
        name: "비교급 + than / the + 비교급",
        koLabel: "비교급",
        mechanism: "more/-er … than, the more ~ the more",
        target: "대조·정도 비교 문장",
        wordBank: "more / reliable / than / intuition / alone",
        example: "more reliable than intuition alone",
        koTip: "비교급 뒤에는 than 또는 of the two 구조를 맞추세요.",
      },
      {
        id: "gp14-superlative",
        modes: ["inflect"],
        name: "최상급 the most / -est",
        koLabel: "최상급",
        mechanism: "the + 최상급 (+ in/of 범위)",
        target: "최고·최우선 주장 문장",
        wordBank: "the / most / attractive / option / available",
        example: "the most attractive option available",
        koTip: "최상급은 the + 최상급 형태를 지킵니다.",
      },
    ],
  },
  {
    point: 15,
    title: "수 일치",
    subtitle: "주어·동사 / 대명사 수 일치 배열",
    cases: [
      {
        id: "gp15-sv",
        modes: ["inflect"],
        name: "긴 수식어 뒤 수일치",
        koLabel: "수일치",
        mechanism: "핵심 주어 수 = 동사 수 (전명구·관계절 무시)",
        target: "주어와 동사 사이 수식어가 긴 중요 문장",
        wordBank: "The / purpose / of / these / labels / is / to / inform",
        example: "The purpose of these labels is to inform",
        koTip: "전치사구 끝 명사가 아니라 핵심 주어에 동사를 맞추세요.",
      },
      {
        id: "gp15-each-every",
        modes: ["basic", "inflect"],
        name: "each/every/one of + 단수동사",
        koLabel: "수일치(대명사)",
        mechanism: "each/every/one of → 단수",
        target: "총칭·개별 지칭 문장",
        wordBank: "each / of / these / findings / supports / the / claim",
        example: "Each of these findings supports the claim",
        koTip: "each/every/one of는 단수 동사입니다.",
      },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type WordOrderFocusPick = {
  point: WordOrderPoint;
  c: WordOrderCase;
  focusBlock: string;
};

/** 모드에 맞는 CASE를 문항마다 다르게 샘플링 */
export function pickWordOrderFocus(mode: WordOrderMode): WordOrderFocusPick {
  const eligible = WORD_ORDER_POINTS.map((p) => ({
    point: p,
    cases: p.cases.filter((c) => c.modes.includes(mode)),
  })).filter((x) => x.cases.length > 0);

  const pool = shuffle(eligible);
  const chosen = pool[0]!;
  const c = shuffle(chosen.cases)[0]!;
  const point = chosen.point;

  // 다양성 힌트: 같은 회차에서 피해야 할 다른 포인트 나열
  const others = shuffle(eligible.filter((x) => x.point.point !== point.point))
    .slice(0, 4)
    .map((x) => `GP${String(x.point.point).padStart(2, "0")} ${x.point.title}`);

  const modeLabel =
    mode === "basic"
      ? "기본(어형 변화 금지)"
      : mode === "inflect"
        ? "어형변화 허용"
        : "단어 추가·변화 허용";

  const lines = [
    `=== 이번 문항 제시어 배열 포커스 (${WORD_ORDER_TEXTBOOK}) ===`,
    `모드: ${modeLabel}`,
    `GRAMMAR POINT ${String(point.point).padStart(2, "0")}: ${point.title} — ${point.subtitle}`,
    `CASE: ${c.koLabel} (${c.name})`,
    `출제 요지: ${c.mechanism}`,
    `빈칸 대상: ${c.target}`,
    `보기 힌트: ${c.wordBank}`,
    `정답 예(교재형): ${c.example}`,
    `해설 힌트: ${c.koTip}`,
    "",
    "필수 규칙:",
    "1) 지문에서 의미상·논리상 중요한 문장/절을 골라 ⓐ 빈칸으로 둔다 (군더더기·연결어만 뽑지 말 것).",
    "2) 위 CASE의 문법·어순이 정답에 분명히 드러나게 다듬어도 됨 (지문 흐름은 유지).",
    "3) 단순 S+V+O만 나열한 ‘쉬운 한 문장’만 반복 금지. 이번 POINT 구문을 반드시 반영.",
    "4) <해석>은 빈칸 정답의 자연스러운 한국어. <보기>는 정답을 섞은 단어(모드 규칙 준수).",
    others.length
      ? `5) 다음 문항 다양성용(이번엔 쓰지 말 것): ${others.join(" · ")}`
      : "",
  ].filter(Boolean);

  return { point, c, focusBlock: lines.join("\n") };
}

export function wordOrderCatalogBrief(): string {
  return [
    `교재: ${WORD_ORDER_TEXTBOOK}`,
    "POINT 요약:",
    ...WORD_ORDER_POINTS.map(
      (p) =>
        `- GP${String(p.point).padStart(2, "0")} ${p.title}: ${p.cases.map((c) => c.koLabel).join(", ")}`
    ),
  ].join("\n");
}
