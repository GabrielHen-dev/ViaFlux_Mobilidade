"use client";

import { createContext, useContext, type ReactNode } from "react";

export const DentroDoPainelLateral = createContext(false);

export default function RaizDaPagina({ className, children }: { className?: string; children: ReactNode }) {
  const noPainel = useContext(DentroDoPainelLateral);
  if (noPainel) return <div className="p-4">{children}</div>;
  return <main id="conteudo" className={className}>{children}</main>;
}
