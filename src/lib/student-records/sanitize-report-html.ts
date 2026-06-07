/** 보고서에 넣지 말아야 할 OCR·면책 문구 제거 */
const OCR_DISCLAIMER_PATTERNS = [
  /\/\/\s*OCR\s*훼손[\s\S]*?명료하게\s*남겨야\s*한다\.?/gi,
  /OCR\s*훼손으로\s*의미가\s*불명확한\s*부분이\s*있어[\s\S]*?명료하게\s*남겨야\s*한다\.?/gi,
  /향후\s*보고서\s*제목[·\s]*탐구\s*결과를\s*명료하게\s*남겨야\s*한다\.?/gi,
  /OCR\s*훼손[\s\S]*?불명확한\s*부분[\s\S]*?향후[\s\S]*?명료하게\s*남겨야\s*한다\.?/gi,
];

function stripBandTerminology(html: string): string {
  return html
    .replace(/입결\s*밴드/g, "입결 수준")
    .replace(/비교\s*밴드/g, "비교 수준")
    .replace(/성적\s*밴드/g, "성적 수준")
    .replace(/해석\s*밴드/g, "해석 수준")
    .replace(/참고\s*밴드/g, "참고 수준")
    .replace(/([가-힣])\s*밴드/g, "$1 수준")
    .replace(/밴드/g, "수준");
}

export function sanitizeStudentRecordReportHtml(html: string): string {
  let result = html;
  for (const pattern of OCR_DISCLAIMER_PATTERNS) {
    result = result.replace(pattern, "");
  }
  result = stripBandTerminology(result);
  return result.replace(/\n{3,}/g, "\n\n");
}
