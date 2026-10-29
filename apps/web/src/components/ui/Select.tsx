"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export type OpcaoDoSelect = {
  valor: string;
  rotulo: string;
  descricao?: string;
  grupo?: string;
  desabilitada?: boolean;
};

type Tamanho = "md" | "sm";

type Props = {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoDoSelect[];
  placeholder?: string;
  disabled?: boolean;
  tamanho?: Tamanho;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type Posicao = { top: number; left: number; width: number; maxHeight: number; acima: boolean };

const ALTURA_MAXIMA_DA_LISTA = 288;
const MARGEM_DA_TELA = 8;
const LARGURA_MINIMA_DA_LISTA = 200;
const TEMPO_DA_BUSCA_POR_TECLADO_MS = 600;

const classeDoGatilho: Record<Tamanho, string> = {
  md: "rounded-lg px-3.5 py-2.5 text-sm",
  sm: "rounded-lg px-3 py-2 text-xs",
};

function calcularPosicao(gatilho: HTMLElement): Posicao {
  const caixa = gatilho.getBoundingClientRect();
  const espacoAbaixo = window.innerHeight - caixa.bottom - MARGEM_DA_TELA;
  const espacoAcima = caixa.top - MARGEM_DA_TELA;
  const acima = espacoAbaixo < 180 && espacoAcima > espacoAbaixo;
  const width = Math.max(caixa.width, LARGURA_MINIMA_DA_LISTA);
  const left = Math.min(Math.max(caixa.left, MARGEM_DA_TELA), window.innerWidth - width - MARGEM_DA_TELA);
  return {
    top: acima ? caixa.top - 6 : caixa.bottom + 6,
    left: Math.max(left, MARGEM_DA_TELA),
    width,
    maxHeight: Math.min(ALTURA_MAXIMA_DA_LISTA, Math.max(acima ? espacoAcima : espacoAbaixo, 120)),
    acima,
  };
}

export default function Select({
  id, value, onChange, opcoes, placeholder = "Selecione", disabled = false, tamanho = "md", className, ...aria
}: Props) {
  const idGerado = useId();
  const idDoGatilho = id ?? `select-${idGerado}`;
  const idDaLista = `${idDoGatilho}-lista`;
  const gatilho = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const busca = useRef({ texto: "", expiraEm: 0 });
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [posicao, setPosicao] = useState<Posicao | null>(null);

  const selecionada = opcoes.find((opcao) => opcao.valor === value);
  const habilitadas = useMemo(() => opcoes.map((opcao, indice) => (opcao.desabilitada ? -1 : indice)).filter((indice) => indice >= 0), [opcoes]);

  const reposicionar = useCallback(() => {
    if (gatilho.current) setPosicao(calcularPosicao(gatilho.current));
  }, []);

  const abrir = useCallback((indiceInicial?: number) => {
    if (disabled) return;
    const indiceSelecionado = opcoes.findIndex((opcao) => opcao.valor === value && !opcao.desabilitada);
    setAtivo(indiceInicial ?? (indiceSelecionado >= 0 ? indiceSelecionado : habilitadas[0] ?? -1));
    reposicionar();
    setAberto(true);
  }, [disabled, opcoes, value, habilitadas, reposicionar]);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }, []);

  const escolher = useCallback((indice: number) => {
    const opcao = opcoes[indice];
    if (!opcao || opcao.desabilitada) return;
    if (opcao.valor !== value) onChange(opcao.valor);
    fechar();
  }, [opcoes, value, onChange, fechar]);

  useLayoutEffect(() => {
    if (!aberto) return;
    reposicionar();
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
  }, [aberto, reposicionar]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: PointerEvent) {
      const alvo = evento.target as Node;
      if (gatilho.current?.contains(alvo) || lista.current?.contains(alvo)) return;
      fechar(false);
    }
    document.addEventListener("pointerdown", aoClicarFora);
    return () => document.removeEventListener("pointerdown", aoClicarFora);
  }, [aberto, fechar]);

  useEffect(() => {
    if (!aberto || ativo < 0) return;
    const elemento = lista.current?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`);
    if (typeof elemento?.scrollIntoView === "function") elemento.scrollIntoView({ block: "nearest" });
  }, [aberto, ativo]);

  function mover(passo: number) {
    if (habilitadas.length === 0) return;
    const posicaoAtual = habilitadas.indexOf(ativo);
    const proxima = posicaoAtual < 0
      ? (passo > 0 ? 0 : habilitadas.length - 1)
      : Math.min(Math.max(posicaoAtual + passo, 0), habilitadas.length - 1);
    setAtivo(habilitadas[proxima]);
  }

  function buscarPorTeclado(tecla: string) {
    const agora = Date.now();
    busca.current = {
      texto: (agora > busca.current.expiraEm ? "" : busca.current.texto) + tecla.toLocaleLowerCase("pt-BR"),
      expiraEm: agora + TEMPO_DA_BUSCA_POR_TECLADO_MS,
    };
    const encontrada = habilitadas.find((indice) => opcoes[indice].rotulo.toLocaleLowerCase("pt-BR").startsWith(busca.current.texto));
    if (encontrada === undefined) return;
    if (aberto) setAtivo(encontrada);
    else if (opcoes[encontrada].valor !== value) onChange(opcoes[encontrada].valor);
  }

  function aoPressionar(evento: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const { key } = evento;
    if (!aberto) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        evento.preventDefault();
        abrir();
      } else if (key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
        buscarPorTeclado(key);
      }
      return;
    }
    if (key === "Escape") {
      evento.preventDefault();
      fechar();
    } else if (key === "Tab") {
      setAberto(false);
    } else if (key === "ArrowDown") {
      evento.preventDefault();
      mover(1);
    } else if (key === "ArrowUp") {
      evento.preventDefault();
      mover(-1);
    } else if (key === "Home" || key === "PageUp") {
      evento.preventDefault();
      setAtivo(habilitadas[0] ?? -1);
    } else if (key === "End" || key === "PageDown") {
      evento.preventDefault();
      setAtivo(habilitadas[habilitadas.length - 1] ?? -1);
    } else if (key === "Enter" || key === " ") {
      evento.preventDefault();
      escolher(ativo);
    } else if (key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      buscarPorTeclado(key);
    }
  }

  const itens = opcoes.map((opcao, indice) => {
    const novoGrupo = opcao.grupo && opcao.grupo !== opcoes[indice - 1]?.grupo;
    const marcada = opcao.valor === value;
    return (
      <li key={`${opcao.grupo ?? ""}-${opcao.valor}`} role="presentation">
        {novoGrupo && (
          <div role="presentation" className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{opcao.grupo}</div>
        )}
        <div
          id={`${idDaLista}-${indice}`}
          role="option"
          aria-selected={marcada}
          aria-disabled={opcao.desabilitada || undefined}
          data-indice={indice}
          onMouseDown={(evento) => evento.preventDefault()}
          onMouseMove={() => { if (!opcao.desabilitada && ativo !== indice) setAtivo(indice); }}
          onClick={() => escolher(indice)}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors",
            ativo === indice && "bg-brand-light text-brand-navy",
            marcada && "font-semibold text-brand-navy",
            opcao.desabilitada && "cursor-not-allowed opacity-40",
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block">{opcao.rotulo}</span>
            {opcao.descricao && <span className="mt-0.5 block text-xs font-normal text-slate-500">{opcao.descricao}</span>}
          </span>
          <Check size={15} aria-hidden className={cn("mt-0.5 shrink-0 text-brand-green", marcada ? "opacity-100" : "opacity-0")} />
        </div>
      </li>
    );
  });

  return (
    <>
      <button
        ref={gatilho}
        id={idDoGatilho}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idDaLista : undefined}
        aria-activedescendant={aberto && ativo >= 0 ? `${idDaLista}-${ativo}` : undefined}
        aria-label={aria["aria-label"]}
        aria-invalid={aria["aria-invalid"]}
        aria-describedby={aria["aria-describedby"]}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoPressionar}
        className={cn(
          "flex w-full items-center justify-between gap-2 border border-[#E2E8F0] bg-white text-left text-brand-dark outline-none transition-all",
          "hover:border-slate-300 focus-visible:border-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue/10",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-red-400",
          aberto && "border-brand-blue ring-2 ring-brand-blue/10",
          classeDoGatilho[tamanho],
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selecionada && "text-slate-400")}>{selecionada?.rotulo ?? placeholder}</span>
        <ChevronDown size={tamanho === "sm" ? 14 : 16} aria-hidden className={cn("shrink-0 text-slate-400 transition-transform", aberto && "rotate-180 text-brand-blue")} />
      </button>
      {aberto && posicao && createPortal(
        <ul
          ref={lista}
          id={idDaLista}
          role="listbox"
          aria-labelledby={idDoGatilho}
          style={{
            position: "fixed",
            left: posicao.left,
            width: posicao.width,
            maxHeight: posicao.maxHeight,
            ...(posicao.acima ? { bottom: window.innerHeight - posicao.top } : { top: posicao.top }),
          }}
          className="z-[60] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-[0_16px_40px_-16px_rgba(15,44,89,0.35)]"
        >
          {opcoes.length === 0
            ? <li role="presentation" className="px-3 py-2.5 text-sm text-slate-400">Nenhuma opção disponível</li>
            : itens}
        </ul>,
        document.body,
      )}
    </>
  );
}
