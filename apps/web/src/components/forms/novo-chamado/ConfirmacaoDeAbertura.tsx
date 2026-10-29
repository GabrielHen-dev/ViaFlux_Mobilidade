"use client";

import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import { PrioridadeIndicador } from "@/components/ui/StatusBadge";
import { formatarDataHora } from "@/utils/date";
import type { ArquivoPendente } from "@/components/forms/novo-chamado/formulario";

interface Props {
  chamado: Chamado;
  arquivos: ArquivoPendente[];
  ehCliente: boolean;
  aoReenviarAnexos: () => void;
  aoNovoChamado: () => void;
}

function SituacaoDoEnvio({ situacao }: { situacao: ArquivoPendente["situacao"] }) {
  if (situacao === "enviado") return <span className="font-semibold text-emerald-700">Enviado</span>;
  if (situacao === "falhou") return <span className="font-semibold text-red-600">Não enviado</span>;
  return <span className="font-semibold text-emerald-700">Enviando…</span>;
}

export default function ConfirmacaoDeAbertura({ chamado, arquivos, ehCliente, aoReenviarAnexos, aoNovoChamado }: Props) {
  const falhas = arquivos.filter((item) => item.situacao === "falhou");
  const destino = ehCliente ? `/portal/chamados/${chamado.id}` : `/chamados/${chamado.id}`;
  const aguardandoTriagem = chamado.prioridade === null;
  return (
    <main id="conteudo" className="flex min-h-[70vh] items-center justify-center p-4 md:min-h-screen md:p-8">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5]">
          <Check size={32} color="#10B981" strokeWidth={2.5} aria-hidden />
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-brand-navy">Chamado aberto</h2>
        <p className="mb-1 text-sm text-[#64748B]">Protocolo</p>
        <p className="mb-4 text-2xl font-bold text-brand-blue" data-testid="protocolo">{chamado.id}</p>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
          {chamado.departamento && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{chamado.departamento.nome}</span>}
        </div>
        {aguardandoTriagem ? (
          <p className="mb-4 text-xs text-[#64748B]" data-testid="previsao-da-triagem">
            Classificação prevista até {formatarDataHora(chamado.triagem.limite)}.
          </p>
        ) : chamado.sla && (
          <p className="mb-4 text-xs text-[#64748B]">
            Início do atendimento até {formatarDataHora(chamado.sla.primeiraResposta.limite)} · Solução até {formatarDataHora(chamado.sla.resolucao.limite)}
          </p>
        )}
        {arquivos.length > 0 && (
          <div className="mb-6 rounded-xl bg-slate-50 p-3 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Anexos</p>
            <ul className="space-y-1 text-xs">
              {arquivos.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2">
                  <span className="break-all text-slate-600">{item.arquivo.name}</span>
                  <SituacaoDoEnvio situacao={item.situacao} />
                </li>
              ))}
            </ul>
            {falhas.length > 0 && (
              <button type="button" onClick={aoReenviarAnexos} className="alvo-toque mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-700">
                <RotateCcw size={12} aria-hidden /> Reenviar anexos
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={destino} className="alvo-toque flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:bg-brand-light">
            Acompanhar chamado
          </Link>
          <button type="button" onClick={aoNovoChamado} className="alvo-toque flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Novo chamado
          </button>
        </div>
      </div>
    </main>
  );
}
