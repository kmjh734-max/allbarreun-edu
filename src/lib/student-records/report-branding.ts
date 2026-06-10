import { ACADEMY_NAME, SITE_URL } from "@/lib/branding";

const LOGO_URL = new URL("/image/logo.png", SITE_URL).toString();

/**
 * AI가 생성한 보고서 HTML에 학원 로고·학원명 머리말과 꼬리말을 삽입.
 * 보고서 본문은 건드리지 않고, 화면·인쇄·공유 페이지에서 모두 보이도록
 * 절대 URL 로고와 인라인 스타일만 사용한다.
 */
export function applyAcademyBrandingToReportHtml(html: string): string {
  if (html.includes("data-academy-branding")) return html;

  const header = [
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

  let out = html;

  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${header}`);
  } else {
    out = `${header}\n${out}`;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${footer}\n</body>`);
  } else {
    out = `${out}\n${footer}`;
  }

  return out;
}
