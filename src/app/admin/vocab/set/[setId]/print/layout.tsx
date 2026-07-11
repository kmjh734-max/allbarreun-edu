import type { ReactNode } from "react";

/** 인쇄 미리보기 — 사이드바 없이 전체 너비 */
export default function VocabSetPrintLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">{children}</div>;
}
