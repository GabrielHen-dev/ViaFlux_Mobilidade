"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

const VIZINHAS_DA_ATUAL = 1;

type ItemDaPaginacao = number | "reticencias-inicio" | "reticencias-fim";

export function paginasVisiveis(atual: number, total: number): ItemDaPaginacao[] {
  const primeira = 0;
  const ultima = total - 1;
  const inicio = Math.max(primeira + 1, atual - VIZINHAS_DA_ATUAL);
  const fim = Math.min(ultima - 1, atual + VIZINHAS_DA_ATUAL);
  const itens: ItemDaPaginacao[] = [primeira];
  if (inicio > primeira + 1) itens.push("reticencias-inicio");
  for (let pagina = inicio; pagina <= fim; pagina++) itens.push(pagina);
  if (fim < ultima - 1) itens.push("reticencias-fim");
  if (ultima > primeira) itens.push(ultima);
  return itens;
}

export function fatiarPagina<T>(itens: T[], pagina: number, tamanho: number) {
  const totalDePaginas = Math.max(1, Math.ceil(itens.length / tamanho));
  const paginaValida = Math.min(Math.max(0, pagina), totalDePaginas - 1);
  return { itens: itens.slice(paginaValida * tamanho, (paginaValida + 1) * tamanho), pagina: paginaValida, totalDePaginas };
}

interface Props {
  pagina: number;
  totalDePaginas: number;
  totalDeItens: number;
  tamanho: number;
  aoMudarDePagina: (pagina: number) => void;
  opcoesDeTamanho?: readonly number[];
  aoMudarDeTamanho?: (tamanho: number) => void;
  rotulo: string;
  className?: string;
}

export default function Paginacao({ pagina, totalDePaginas, totalDeItens, tamanho, aoMudarDePagina, opcoesDeTamanho, aoMudarDeTamanho, rotulo, className }: Props) {
  if (totalDeItens === 0) return null;
  const primeiroItem = pagina * tamanho + 1;
  const ultimoItem = Math.min(totalDeItens, (pagina + 1) * tamanho);
  const idDoTamanho = `tamanho-${rotulo.toLowerCase().replace(/\W+/g, "-")}`;

  return (
    <nav aria-label={rotulo} className={cn("flex flex-wrap items-center justify-between gap-3 text-xs text-tinta-suave", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular-nums">Mostrando <strong className="font-medium text-tinta">{primeiroItem}–{ultimoItem}</strong> de <strong className="font-medium text-tinta">{totalDeItens}</strong></span>
        {opcoesDeTamanho && aoMudarDeTamanho && (
          <span className="flex items-center gap-1.5">
            <label htmlFor={idDoTamanho}>Por página</label>
            <select
              id={idDoTamanho}
              value={tamanho}
              onChange={(evento) => aoMudarDeTamanho(Number(evento.target.value))}
              className="h-7 rounded border border-linha-forte bg-white px-1.5 text-xs text-tinta outline-none focus:border-acao"
            >
              {opcoesDeTamanho.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
            </select>
          </span>
        )}
      </div>
      {totalDePaginas > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <button type="button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => aoMudarDePagina(pagina - 1)} className="vf-pagina-botao alvo-toque">
              <ChevronLeft size={14} aria-hidden />
            </button>
          </li>
          {paginasVisiveis(pagina, totalDePaginas).map((item) => (
            <li key={item}>
              {typeof item === "number" ? (
                <button
                  type="button"
                  aria-label={`Página ${item + 1}`}
                  aria-current={item === pagina ? "page" : undefined}
                  onClick={() => aoMudarDePagina(item)}
                  className="vf-pagina-botao alvo-toque tabular-nums"
                >
                  {item + 1}
                </button>
              ) : (
                <span className="px-1 text-tinta-apagada" aria-hidden>…</span>
              )}
            </li>
          ))}
          <li>
            <button type="button" aria-label="Próxima página" disabled={pagina + 1 >= totalDePaginas} onClick={() => aoMudarDePagina(pagina + 1)} className="vf-pagina-botao alvo-toque">
              <ChevronRight size={14} aria-hidden />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}

export function PaginacaoCompacta({ pagina, totalDePaginas, aoMudarDePagina, rotulo }: { pagina: number; totalDePaginas: number; aoMudarDePagina: (pagina: number) => void; rotulo: string }) {
  if (totalDePaginas <= 1) return null;
  return (
    <nav aria-label={rotulo} className="flex items-center justify-between gap-1 border-t border-linha px-2 py-1.5 text-xs text-tinta-suave">
      <button type="button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => aoMudarDePagina(pagina - 1)} className="vf-pagina-botao">
        <ChevronLeft size={14} aria-hidden />
      </button>
      <span className="tabular-nums">{pagina + 1} / {totalDePaginas}</span>
      <button type="button" aria-label="Próxima página" disabled={pagina + 1 >= totalDePaginas} onClick={() => aoMudarDePagina(pagina + 1)} className="vf-pagina-botao">
        <ChevronRight size={14} aria-hidden />
      </button>
    </nav>
  );
}
