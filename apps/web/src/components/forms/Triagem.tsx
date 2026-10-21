"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import ConclusaoDaTriagem from "@/components/triagem/ConclusaoDaTriagem";
import Reclassificacao from "@/components/triagem/Reclassificacao";
import OverrideDePrioridade from "@/components/triagem/OverrideDePrioridade";
import { cartaoClass } from "@/components/triagem/CamposDaTriagem";
import { NOME_TIPO, ROTULO_PESO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_TRIAGEM } from "@/utils/perfis";

function InformadoPeloCliente({ chamado }: { chamado: Chamado }) {
  return (
    <section className={cartaoClass}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-brand-navy">O que o cliente informou</h2>
        <StatusBadge status={chamado.status} />
      </div>
      <p className="text-xs text-slate-500">{chamado.cliente} · aberto em {formatarDataHora(chamado.abertura)}</p>
      {chamado.motivo && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold">Motivo:</span> {chamado.motivo.descricao} <span className="text-xs text-slate-400">({NOME_TIPO[chamado.motivo.tipo]} · severidade {ROTULO_PESO[chamado.motivo.severidade].toLowerCase()})</span>
        </p>
      )}
      {chamado.contexto && (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold">Contexto:</span> {chamado.contexto.descricao} <span className="text-xs text-slate-400">(urgência {ROTULO_PESO[chamado.contexto.urgencia].toLowerCase()})</span>
        </p>
      )}
      {chamado.descricao && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{chamado.descricao}</p>}
      {chamado.localizacao && <p className="mt-2 text-xs text-slate-500">Local: {chamado.localizacao}</p>}
    </section>
  );
}

function ClassificacaoVigente({ chamado }: { chamado: Chamado }) {
  const { classificacao } = chamado;
  if (!classificacao) return null;
  return (
    <section className={cartaoClass}>
      <h2 className="mb-3 font-display text-sm font-semibold text-brand-navy">Classificação vigente</h2>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><div className="text-xs text-slate-400">Tipo</div><div className="font-semibold">{NOME_TIPO[classificacao.tipo]}</div></div>
        <div><div className="text-xs text-slate-400">Severidade</div><div className="font-semibold">{ROTULO_PESO[classificacao.severidade]} ({classificacao.severidade})</div></div>
        <div><div className="text-xs text-slate-400">Urgência</div><div className="font-semibold">{ROTULO_PESO[classificacao.urgencia]} ({classificacao.urgencia})</div></div>
        <div><div className="text-xs text-slate-400">Calculada</div><PrioridadeIndicador prioridade={classificacao.prioridade} score={classificacao.score} /></div>
      </div>
      {chamado.triagem.concluidaEm && (
        <p className="mt-3 text-xs text-slate-500">Triagem concluída por {chamado.triagem.concluidaPor?.nome ?? "—"} em {formatarDataHora(chamado.triagem.concluidaEm)}.</p>
      )}
    </section>
  );
}

function TriagemConteudo({ chamado }: { chamado: Chamado }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const triado = chamado.classificacao !== null;

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Triagem — #{chamado.id}</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              {triado ? "Revise a classificação e, se preciso, ajuste a prioridade." : "Classifique o chamado para encaminhá-lo à fila do departamento."}
            </p>
          </div>
        </div>

        {aviso && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{aviso}</p>}

        <div className="space-y-5">
          <InformadoPeloCliente chamado={chamado} />
          {chamado.classificacao && chamado.prioridade ? (
            <>
              <ClassificacaoVigente chamado={chamado} />
              <Reclassificacao chamado={chamado} vigente={chamado.classificacao} aoConcluir={setAviso} />
              <OverrideDePrioridade chamado={chamado} prioridadeEfetiva={chamado.prioridade} aoConcluir={setAviso} />
            </>
          ) : (
            <ConclusaoDaTriagem chamado={chamado} aoConcluir={setAviso} />
          )}
        </div>
      </div>
    </main>
  );
}

export default function Triagem({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_DE_TRIAGEM}>
      <ComChamado id={id}>{(chamado) => <TriagemConteudo key={chamado.id} chamado={chamado} />}</ComChamado>
    </PerfilRequerido>
  );
}
