"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import type { Anexo } from "@/types/chamado";
import { Button } from "@/components/ui/button";

const tamanhoAnexo = z.number().max(10 * 1024 * 1024, "Cada arquivo deve ter no máximo 10 MB.");

export default function AnexosInput({ anexos, onAdicionar, compacto = false }: { anexos: Anexo[]; onAdicionar: (anexos: Anexo[]) => void; compacto?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const selecionar = (files: FileList | null) => {
    if (!files) return;
    const itens = Array.from(files);
    if (itens.some((file) => !tamanhoAnexo.safeParse(file.size).success)) {
      setErro("Cada arquivo deve ter no máximo 10 MB.");
      return;
    }
    setErro("");
    onAdicionar(itens.map((file) => ({ id: crypto.randomUUID(), nome: file.name, tamanho: file.size, tipo: file.type })));
  };
  return <div>
    <input ref={input} aria-label="Selecionar anexos" type="file" multiple tabIndex={-1} className="sr-only" onChange={(e) => { selecionar(e.target.files); e.target.value = ""; }} />
    {compacto ? <Button type="button" variant="outline" onClick={() => input.current?.click()} className="w-full rounded-lg border-dashed border-slate-300 py-2 text-xs font-normal text-slate-400 hover:border-brand-blue hover:text-brand-blue">+ Anexar arquivo</Button> :
      <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selecionar(e.dataTransfer.files); }} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-blue transition-colors">
        <svg aria-hidden="true" className="mx-auto mb-2 text-slate-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        <span className="block text-sm text-slate-500">Arraste arquivos ou <span className="text-brand-blue font-semibold">clique para selecionar</span></span>
        <span className="block text-xs text-slate-400 mt-1">Fotos, documentos — máx. 10 MB</span>
      </button>}
    {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
    {anexos.length > 0 && <ul className="mt-3 space-y-1 text-xs text-slate-500">{anexos.map((anexo) => <li key={anexo.id} className="break-all">{anexo.nome}</li>)}</ul>}
  </div>;
}
