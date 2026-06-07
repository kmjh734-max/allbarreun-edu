import {
  STUDENT_RECORD_MAX_PDF_PAGES,
  STUDENT_RECORD_PAGE_JPEG_TARGET_BYTES,
} from "@/lib/student-records/limits";

const MAX_PAGE_EDGE = 2400;

export async function pdfFileToJpegFiles(
  file: File,
  options?: {
    maxPages?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<File[]> {
  const maxPages = options?.maxPages ?? STUDENT_RECORD_MAX_PDF_PAGES;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageLimit = Math.min(pdf.numPages, maxPages);
  const baseName = file.name.replace(/\.pdf$/i, "") || "student-record";
  const output: File[] = [];

  for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
    options?.onProgress?.(pageNum, pageLimit);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const edgeScale = MAX_PAGE_EDGE / Math.max(viewport.width, viewport.height);
    const renderScale = Math.min(2.5, Math.max(1.25, edgeScale));
    const scaled = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(scaled.width);
    canvas.height = Math.floor(scaled.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: scaled }).promise;

    let quality = 0.92;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      if (!blob) break;
      if (blob.size <= STUDENT_RECORD_PAGE_JPEG_TARGET_BYTES) break;
      quality -= 0.05;
      if (quality < 0.68) break;
    }

    if (blob && blob.size > 8_000) {
      output.push(
        new File([blob], `${baseName}-p${String(pageNum).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        })
      );
    }
  }

  return output;
}
