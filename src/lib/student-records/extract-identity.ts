/**
 * 학생부 OCR 텍스트의 인적·학적사항에서 성명과 학교명을 추출.
 * 학생을 선택하지 않고 분석한 경우 기록 표시용으로 사용한다.
 */
export function extractStudentIdentityFromRecordText(text: string): {
  name: string | null;
  school: string | null;
} {
  return {
    name: extractName(text),
    school: extractSchool(text),
  };
}

/** 표 머리글·라벨 등 이름이 될 수 없는 단어 */
const NAME_STOPWORDS = new Set([
  "학년",
  "학생",
  "학번",
  "성명",
  "성별",
  "이름",
  "번호",
  "반별",
  "남자",
  "여자",
  "주민",
  "생년",
  "월일",
  "생년월일",
  "한자",
  "주소",
  "전화",
  "연락처",
  "졸업",
  "입학",
  "담임",
  "구분",
  "내용",
  "비고",
  "해당",
  "또래",
  "동료",
  "다른",
  "모든",
  "본인",
  "우리",
]);

function isPlausibleName(candidate: string): boolean {
  if (candidate.length < 2 || candidate.length > 4) return false;
  if (NAME_STOPWORDS.has(candidate)) return false;
  if (/(학교|학년|학기)$/.test(candidate)) return false;
  return true;
}

function extractName(text: string): string | null {
  const patterns = [
    // "성명: 김민준" — 콜론이 있으면 줄바꿈 너머도 허용
    /성\s*명\s*[:：]\s*([가-힣]{2,4}?)(?=[^가-힣]|$)/g,
    // "성명 김민준", "성명 | 김민준" — 같은 줄 안에서만 (표 머리글 오인 방지)
    /성\s*명[^가-힣\n]{0,6}([가-힣]{2,4}?)(?=[^가-힣]|$)/g,
    // 행동특성·종합의견 서술: "김민준 학생은 …"
    /([가-힣]{2,4}?)\s*학생(?:은|이|의|에게)/g,
  ];

  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const candidate = match[1]?.trim();
      if (candidate && isPlausibleName(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function extractSchool(text: string): string | null {
  const matches = text.match(
    /[가-힣A-Za-z0-9]{1,20}(?:고등학교|중학교|초등학교)/g
  );
  if (!matches || matches.length === 0) return null;

  // 학적사항에는 이전 학교(졸업)도 함께 적히므로 상급 학교를 우선한다.
  for (const suffix of ["고등학교", "중학교", "초등학교"]) {
    const found = matches.find((m) => m.endsWith(suffix));
    if (found) return found;
  }
  return matches[0] ?? null;
}
