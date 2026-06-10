import { ACADEMY_NAME, SITE_URL } from "@/lib/branding";

const LOGO_URL = new URL("/image/logo.png", SITE_URL).toString();

/**
 * AI가 생성한 보고서 HTML에 학원 로고·학원명 머리말과 꼬리말을 삽입.
 * 보고서 본문은 건드리지 않고, 화면·인쇄·공유 페이지에서 모두 보이도록
 * 절대 URL 로고와 인라인 스타일만 사용한다.
 */
export function applyAcademyBrandingToReportHtml(html: string): string {

  // 제목(h1) 오른쪽에 로고+학원명 배치 — 어두운 Hero 배경에서도 보이도록
  // 로고는 흰색 칩 안에, 학원명은 흰색 글씨로 표시
  const titleBranding = [
    `<span data-academy-branding="header" style="display:inline-flex;align-items:center;gap:10px;flex-shrink:0;">`,
    `<span style="display:inline-flex;background:#ffffff;border-radius:12px;padding:6px 10px;box-shadow:0 4px 14px rgba(0,0,0,.18);">`,
    `<img src="${LOGO_URL}" alt="${ACADEMY_NAME}" style="height:30px;width:auto;display:block;"/>`,
    `</span>`,
    `<span style="font-size:1.15rem;font-weight:900;color:#ffffff;letter-spacing:-0.02em;text-shadow:0 2px 8px rgba(0,0,0,.25);">${ACADEMY_NAME}</span>`,
    `</span>`,
  ].join("");

  // h1을 찾지 못할 때 본문 맨 위에 넣는 대체 머리말
  const fallbackHeader = [
    `<div data-academy-branding="header" style="max-width:1180px;margin:0 auto;padding:22px 18px 0;display:flex;align-items:center;justify-content:center;gap:12px;">`,
    `<img src="${LOGO_URL}" alt="${ACADEMY_NAME}" style="height:40px;width:auto;display:block;"/>`,
    `<span style="font-size:1.25rem;font-weight:900;color:#1a237e;letter-spacing:-0.02em;">${ACADEMY_NAME}</span>`,
    `</div>`,
  ].join("");

  const footer = [
    `<div data-academy-branding="footer" style="max-width:1180px;margin:30px auto 0;padding:18px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;gap:8px;color:#64748b;font-size:12px;">`,
    `<img src="${LOGO_URL}" alt="" style="height:18px;width:auto;display:block;opacity:.9;"/>`,
    `<span style="font-weight:700;color:#475569;">${ACADEMY_NAME}</span>`,
    `<span>· 본 보고서는 ${ACADEMY_NAME}에서 제작했습니다.</span>`,
    `</div>`,
  ].join("");

  // 구버전(상단 레터헤드)으로 저장된 보고서는 제거 후 새 위치로 재삽입
  let out = html.replace(
    /<div data-academy-branding="header"[\s\S]*?<\/div>/i,
    ""
  );

  if (!out.includes('data-academy-branding="header"')) {
    const h1Pattern = /<h1([^>]*)>([\s\S]*?)<\/h1>/i;
    if (h1Pattern.test(out)) {
      out = out.replace(
        h1Pattern,
        (_m, attrs: string, inner: string) =>
          `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">` +
          `<h1${attrs}>${inner}</h1>${titleBranding}</div>`
      );
    } else if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${fallbackHeader}`);
    } else {
      out = `${fallbackHeader}\n${out}`;
    }
  }

  if (!out.includes('data-academy-branding="footer"')) {
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${footer}\n</body>`);
    } else {
      out = `${out}\n${footer}`;
    }
  }

  return out;
}
