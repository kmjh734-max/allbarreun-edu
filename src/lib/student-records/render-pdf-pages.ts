import type { PDFParse } from "pdf-parse";
import { STUDENT_RECORD_PDF_RENDER_WIDTH } from "@/lib/student-records/limits";

export async function renderPdfPageImages(
  parser: PDFParse,
  pageLimit: number
): Promise<string[]> {
  const urls: string[] = [];

  for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
    try {
      const shot = await parser.getScreenshot({
        partial: [pageNum],
        desiredWidth: STUDENT_RECORD_PDF_RENDER_WIDTH,
        imageDataUrl: true,
        imageBuffer: false,
      });
      const dataUrl = shot.pages[0]?.dataUrl;
      if (dataUrl?.startsWith("data:image/")) {
        urls.push(dataUrl);
      }
    } catch {
      // 개별 페이지 실패는 건너뜀
    }
  }

  return urls;
}
