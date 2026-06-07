import { sanitizeStudentRecordReportHtml } from "@/lib/student-records/sanitize-report-html";

export function extractHtmlFromModelOutput(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return sanitizeStudentRecordReportHtml(normalizeHtmlDocument(fenced[1].trim()));
  }

  const docStart = trimmed.search(/<!DOCTYPE\s+html/i);
  const htmlStart = trimmed.search(/<html[\s>]/i);
  const start =
    docStart >= 0 ? docStart : htmlStart >= 0 ? htmlStart : -1;

  if (start >= 0) {
    const end = trimmed.toLowerCase().lastIndexOf("</html>");
    if (end > start) {
      return sanitizeStudentRecordReportHtml(
        normalizeHtmlDocument(trimmed.slice(start, end + 7))
      );
    }
    return sanitizeStudentRecordReportHtml(normalizeHtmlDocument(trimmed.slice(start)));
  }

  return sanitizeStudentRecordReportHtml(normalizeHtmlDocument(trimmed));
}

function normalizeHtmlDocument(html: string): string {
  if (/<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html)) {
    return html;
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>학생부 분석 보고서</title>
</head>
<body>
${html}
</body>
</html>`;
}
