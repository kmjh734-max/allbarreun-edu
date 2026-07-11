import type { ReactNode } from "react";

export default function VocabSetPrintLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">{children}</div>;
}
