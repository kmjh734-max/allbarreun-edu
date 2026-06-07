import "pdf-parse/worker";
import { CanvasFactory, getData } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

PDFParse.setWorker(getData());

export function createPdfParser(buffer: Buffer): PDFParse {
  return new PDFParse({ data: buffer, CanvasFactory });
}
