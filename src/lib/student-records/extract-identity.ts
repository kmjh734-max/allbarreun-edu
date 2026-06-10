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

function extractName(text: string): string | null {
  const match = text.match(
    /성\s*명\s*[:：]?\s*([가-힣]{2,4}?)(?=\s|[0-9(:：·,]|성별|주민|생년|$)/
  );
  const name = match?.[1]?.trim() ?? null;
  if (!name || name === "학생") return null;
  return name;
}

function extractSchool(text: string): string | null {
  const matches = text.match(/[가-힣A-Za-z0-9]{1,20}(?:고등학교|중학교|초등학교)/g);
  if (!matches || matches.length === 0) return null;

  // 학적사항에는 이전 학교(졸업)도 함께 적히므로 상급 학교를 우선한다.
  for (const suffix of ["고등학교", "중학교", "초등학교"]) {
    const found = matches.find((m) => m.endsWith(suffix));
    if (found) return found;
  }
  return matches[0] ?? null;
}
