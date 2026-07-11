"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Class, VocabFolder } from "@/types/database";
import type { VocabSidebarSet } from "@/components/vocab/vocab-sidebar-types";

export interface VocabSidebarContextValue {
  classes: Class[];
  folders: VocabFolder[];
  sets: VocabSidebarSet[];
}

const VocabSidebarContext = createContext<VocabSidebarContextValue | null>(null);

export function VocabSidebarProvider({
  value,
  children,
}: {
  value: VocabSidebarContextValue;
  children: ReactNode;
}) {
  return (
    <VocabSidebarContext.Provider value={value}>
      {children}
    </VocabSidebarContext.Provider>
  );
}

export function useVocabSidebar(): VocabSidebarContextValue {
  const ctx = useContext(VocabSidebarContext);
  if (!ctx) {
    throw new Error("useVocabSidebar must be used within VocabSidebarProvider");
  }
  return ctx;
}
