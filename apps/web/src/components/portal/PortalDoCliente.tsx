"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ChevronRight, CirclePlus, Search } from "lucide-react";
import { useListaDeChamados } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_CLIENTE } from "@/utils/perfis";

const FORMATO_DO_PROTOCOLO = /^VF-\d{4,}$/;

function ConteudoDoPortal() {
  const router = useRouter();
  const [protocolo, setProtocolo] = useState("");
  const [erroDoProtocolo, setErroDoProtocolo] = useState("");
  const lista = useListaDeChamados({ ordenacao: "recentes", size: 50 });

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
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Meus chamados</h1>
            <p className="text-sm text-slate-500">Acompanhe o andamento sem precisar ligar para a Central.</p>
          </div>
          <Link href="/chamados/novo" className="alvo-toque inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <CirclePlus size={16} aria-hidden /> Abrir chamado
          </Link>
        </div>

        <form onSubmit={buscar} className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-4" noValidate>
          <label htmlFor="busca-protocolo" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar pelo protocolo</label>
          <div className="flex gap-2">
            <input id="busca-protocolo" value={protocolo} onChange={(evento) => setProtocolo(evento.target.value)} placeholder="VF-0001" aria-invalid={erroDoProtocolo ? true : undefined} aria-describedby={erroDoProtocolo ? "busca-protocolo-erro" : undefined} className="alvo-toque min-w-0 flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm uppercase outline-none focus:border-brand-blue" />
            <button type="submit" className="alvo-toque inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white"><Search size={14} aria-hidden /> Buscar</button>
          </div>
          {erroDoProtocolo && <p id="busca-protocolo-erro" className="mt-1 text-xs font-medium text-red-600">{erroDoProtocolo}</p>}
        </form>

        {lista.isPending ? <Carregando texto="Carregando seus chamados…" /> : lista.isError ? (
          <FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} />
        ) : lista.data.content.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Você ainda não abriu nenhum chamado.</p>
        ) : (
          <ul className="space-y-3">
            {lista.data.content.map((chamado) => (
              <li key={chamado.id}>
                <Link href={`/portal/chamados/${chamado.id}`} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition hover:border-brand-blue">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-brand-blue">{chamado.id}</span>
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
        )}
      </div>
    </main>
  );
}

export default function PortalDoCliente() {
  return <PerfilRequerido perfis={PERFIS_DE_CLIENTE}><ConteudoDoPortal /></PerfilRequerido>;
}
