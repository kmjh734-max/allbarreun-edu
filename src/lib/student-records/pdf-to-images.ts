import { STUDENT_RECORD_MAX_PDF_PAGES, STUDENT_RECORD_PDF_RENDER_WIDTH } from "@/lib/student-records/limits";
import { createPdfParser } from "@/lib/student-records/pdf-runtime";
import { renderPdfPageImages } from "@/lib/student-records/render-pdf-pages";

export async function convertPdfBufferToPageImages(
  buffer: Buffer
): Promise<{ pageCount: number; images: string[] }> {
  const parser = createPdfParser(buffer);

  try {
    let pageCount = STUDENT_RECORD_MAX_PDF_PAGES;
    try {
      const info = await parser.getInfo();
      if (info.total > 0) {
        pageCount = Math.min(info.total, STUDENT_RECORD_MAX_PDF_PAGES);
      }
    } catch {
      // getInfo 실패 시 최대 페이지로 시도
    }

    const images = await renderPdfPageImages(parser, pageCount);
    return { pageCount, images };
  } finally {
    await parser.destroy();
  }
}

export { STUDENT_RECORD_PDF_RENDER_WIDTH };
