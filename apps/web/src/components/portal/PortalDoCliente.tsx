"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Status } from "@/types/chamado";
import { cn } from "@/utils/cn";
import { ChevronRight, CirclePlus, Search } from "lucide-react";
import { useListaDeChamados } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_CLIENTE } from "@/utils/perfis";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import AvisoDeEmailNaoVerificado from "@/components/auth/AvisoDeEmailNaoVerificado";

const FORMATO_DO_PROTOCOLO = /^VF-\d{4,}$/;
const STATUS_ENCERRADOS: readonly Status[] = ["Resolvido", "Fechado", "Cancelado"];
const ABAS = [
  { id: "todos", rotulo: "Todos", filtro: () => true },
  { id: "abertos", rotulo: "Abertos", filtro: (status: Status) => !STATUS_ENCERRADOS.includes(status) },
  { id: "resolvidos", rotulo: "Resolvidos", filtro: (status: Status) => STATUS_ENCERRADOS.includes(status) },
] as const;
type IdDaAba = (typeof ABAS)[number]["id"];

function ConteudoDoPortal() {
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const [protocolo, setProtocolo] = useState("");
  const [erroDoProtocolo, setErroDoProtocolo] = useState("");
  const [pagina, setPagina] = useState(0);
  const [aba, setAba] = useState<IdDaAba>("todos");
  const lista = useListaDeChamados({ ordenacao: "ativos_recentes", page: pagina, size: 50 });

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const normalizado = protocolo.trim().toUpperCase();
    if (!FORMATO_DO_PROTOCOLO.test(normalizado)) {
      setErroDoProtocolo("Informe o protocolo no formato VF-0000.");
      return;
    }
    setErroDoProtocolo("");
    router.push(`/portal/chamados/${normalizado}`);
  }

  return (
    <main id="conteudo" className="vf-pagina">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-tinta">Meus chamados</h1>
          <Link href="/chamados/novo" className="alvo-toque inline-flex items-center gap-2 rounded-xl vf-botao-primario px-5 py-2.5 text-sm font-semibold text-white">
            <CirclePlus size={16} aria-hidden /> Abrir chamado
          </Link>
        </div>

        <AvisoDeEmailNaoVerificado usuario={usuario} />

        <form onSubmit={buscar} className="mb-6 rounded-2xl border border-linha bg-white p-4" noValidate>
          <label htmlFor="busca-protocolo" className="mb-2 block text-xs font-medium text-slate-500">Buscar por protocolo</label>
          <div className="flex gap-2">
            <input id="busca-protocolo" value={protocolo} onChange={(evento) => setProtocolo(evento.target.value)} placeholder="VF-0001" aria-invalid={erroDoProtocolo ? true : undefined} aria-describedby={erroDoProtocolo ? "busca-protocolo-erro" : undefined} className="alvo-toque min-w-0 flex-1 rounded-lg border border-linha px-3 py-2 text-sm uppercase outline-none focus:border-brand-blue" />
            <button type="submit" className="alvo-toque inline-flex items-center gap-2 rounded-lg vf-botao-primario px-4 py-2 text-sm font-semibold text-white"><Search size={14} aria-hidden /> Buscar</button>
          </div>
          {erroDoProtocolo && <p id="busca-protocolo-erro" className="mt-1 text-xs font-medium text-red-600">{erroDoProtocolo}</p>}
        </form>

        <div role="tablist" aria-label="Situação dos chamados" className="mb-3 flex rounded border border-linha bg-white px-2">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              onClick={() => setAba(item.id)}
              className="vf-aba alvo-toque px-3 py-3"
            >
              {item.rotulo}
              {lista.data && <span className={cn("ml-1.5 rounded px-1.5 text-[11px] normal-case tabular-nums", aba === item.id ? "bg-acao-suave" : "bg-fundo")}>{lista.data.content.filter((chamado) => item.filtro(chamado.status)).length}</span>}
            </button>
          ))}
        </div>

        {lista.isPending || lista.isPlaceholderData ? <Carregando texto="Carregando chamados…" /> : lista.isError ? (
          <FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} />
        ) : lista.data.content.filter((chamado) => ABAS.find((item) => item.id === aba)!.filtro(chamado.status)).length === 0 ? (
          <p className="rounded border border-dashed border-linha-forte bg-white p-10 text-center text-sm text-tinta-suave">{aba === "resolvidos" ? "Nenhum chamado resolvido." : "Nenhum chamado aberto."}</p>
        ) : (
          <>
            <ul className="vf-cartao divide-y divide-linha overflow-hidden">
              {lista.data.content.filter((chamado) => ABAS.find((item) => item.id === aba)!.filtro(chamado.status)).map((chamado) => (
                <li key={chamado.id}>
                  <Link href={`/portal/chamados/${chamado.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-fundo">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-acao">{chamado.id}</span>
                        <StatusBadge status={chamado.status} />
                        <PrioridadeIndicador prioridade={chamado.prioridade} />
                      </div>
                      <p className="text-xs text-slate-500">Última atualização: {formatarDataHora(chamado.atualizadoEm)}</p>
                    </div>
                    <ChevronRight size={16} className="flex-shrink-0 text-slate-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {lista.data.totalPages > 1 && (
              <nav aria-label="Páginas dos meus chamados" className="mt-5 flex items-center justify-between gap-3 text-sm">
                <button type="button" disabled={pagina === 0} onClick={() => setPagina((atual) => atual - 1)} className="vf-botao-secundario alvo-toque rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-tinta disabled:opacity-40">Anterior</button>
                <span className="text-slate-500">Página {pagina + 1} de {lista.data.totalPages}</span>
                <button type="button" disabled={pagina + 1 >= lista.data.totalPages} onClick={() => setPagina((atual) => atual + 1)} className="vf-botao-secundario alvo-toque rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-tinta disabled:opacity-40">Próxima</button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function PortalDoCliente() {
  return <PerfilRequerido perfis={PERFIS_DE_CLIENTE}><ConteudoDoPortal /></PerfilRequerido>;
}
