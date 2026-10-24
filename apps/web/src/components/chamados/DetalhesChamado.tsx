"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Hand, Trash, UserCheck } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import { assumirAtendimento, moverParaLixeira } from "@/services/api/chamados";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { invalidarListas, useAcaoNoChamado } from "@/hooks/consultas";
import ComChamado from "@/components/chamados/ComChamado";
import AlteracaoDeStatus from "@/components/chamados/AlteracaoDeStatus";
import TimelineChamado from "@/components/chamados/TimelineChamado";
import AnexosDoChamado from "@/components/chamados/AnexosDoChamado";
import LocalizacaoDoChamado from "@/components/chamados/LocalizacaoDoChamado";
import ServicoTerceiroForm from "@/components/forms/ServicoTerceiroForm";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { SlaDoChamado } from "@/components/ui/SlaIndicador";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO, ROTULO_PESO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";
import {
  PERFIS_DA_CENTRAL, PERFIS_DA_LIXEIRA, PERFIS_DE_CLIENTE, PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, PERFIS_QUE_CONDUZEM, usuarioTemPerfil,
} from "@/utils/perfis";
import PerfilRequerido from "@/components/auth/PerfilRequerido";

const STATUS_QUE_PODEM_SER_ASSUMIDOS = ["Na fila", "Em atendimento", "Aguardando"];

export const ROTULO_DO_MOTIVO_AGUARDANDO = { CLIENTE: "cliente", FORNECEDOR: "fornecedor", OUTRO_DEPARTAMENTO: "outro departamento" } as const;

function Informacao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">{rotulo}</div>
      <div className="break-words text-sm font-semibold text-brand-dark">{valor || "—"}</div>
    </div>
  );
}

function DetalhesConteudo({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const api = useApi();
  const router = useRouter();
  const clienteDeConsultas = useQueryClient();
  const fazTriagem = usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM);
  const conduz = usuarioTemPerfil(usuario, PERFIS_QUE_CONDUZEM);
  const atende = usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM);
  const podeExcluir = usuarioTemPerfil(usuario, PERFIS_DA_LIXEIRA);
  const { classificacao, triagem, atendimento } = chamado;
  const triado = classificacao !== null;
  const responsavel = atendimento?.responsavel ?? null;
  const ehMeu = responsavel?.id === usuario.id;
  const podeAssumir = atende && triado && STATUS_QUE_PODEM_SER_ASSUMIDOS.includes(chamado.status) && !(ehMeu && chamado.status === "Em atendimento");
  const assumeNoLugar = chamado.status === "Em atendimento" && responsavel !== null && !ehMeu;
  const assumir = useAcaoNoChamado<void>(chamado.id, (cliente) => assumirAtendimento(cliente, chamado.id));
  const exclusao = useMutation({
    mutationFn: () => moverParaLixeira(api, chamado.id),
    onSuccess: () => { void invalidarListas(clienteDeConsultas); router.push("/"); },
  });

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Link href="/" aria-label="Voltar ao Dashboard" className="alvo-toque flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-brand-navy">#{chamado.id}</h1>
              <StatusBadge status={chamado.status} />
              <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
            </div>
            <p className="text-sm text-[#64748B]">
              <span className="font-semibold text-brand-navy">{chamado.departamento?.nome ?? (triado ? "Sem departamento" : "Aguardando triagem")}</span> · Aberto em {formatarDataHora(chamado.abertura)}
            </p>
          </div>
        </div>
        {(conduz || atende) && (
          <div className="flex flex-wrap gap-2">
            {podeAssumir && (
              <button type="button" disabled={assumir.isPending} onClick={() => assumir.mutate()} className="alvo-toque inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                <Hand size={14} aria-hidden /> {assumir.isPending ? "Assumindo…" : assumeNoLugar ? `Assumir no lugar de ${responsavel?.nome}` : "Assumir chamado"}
              </button>
            )}
            {fazTriagem && !triado && (
              <Link href={`/chamados/${chamado.id}/triagem`} className="alvo-toque inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                <ClipboardList size={14} aria-hidden /> Fazer triagem
              </Link>
            )}
            {fazTriagem && triado && (
              <Link href={`/chamados/${chamado.id}/triagem`} className="alvo-toque rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569] transition-all hover:bg-white">Triagem</Link>
            )}
            {triado && conduz && (
              <Link href={`/chamados/${chamado.id}/encaminhamento`} className="alvo-toque rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                {atende ? "Transferir / status" : "Transferir"}
              </Link>
            )}
            {podeExcluir && (
              <button type="button" disabled={exclusao.isPending} onClick={() => exclusao.mutate()} title="Mover para lixeira" className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] px-3 py-2 text-sm font-semibold text-[#EF4444] transition-all hover:bg-[#FEF2F2]">
                <Trash size={14} aria-hidden /> Excluir
              </button>
            )}
          </div>
        )}
      </div>
      {(assumir.isError || exclusao.isError) && <div className="mb-4"><AvisoDeErro erro={assumir.error ?? exclusao.error} /></div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Solicitação</h2>
            {chamado.motivo && (
              <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
                <p><span className="font-semibold text-brand-dark">Motivo:</span> {chamado.motivo.descricao}</p>
                {chamado.contexto && <p className="mt-1"><span className="font-semibold text-brand-dark">Contexto:</span> {chamado.contexto.descricao}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Informacao rotulo="Cliente" valor={chamado.cliente} />
              <Informacao rotulo="Telefone" valor={chamado.telefone} />
              <Informacao rotulo="Veículo" valor={chamado.modelo} />
              <Informacao rotulo="Placa" valor={chamado.placa} />
              <Informacao rotulo="Tipo" valor={chamado.tipo ? NOME_TIPO[chamado.tipo] : "A classificar — revisão da Central"} />
              <Informacao rotulo="Última atualização" valor={formatarDataHora(chamado.atualizadoEm)} />
            </div>
            {chamado.descricao && (
              <div className="mt-4 border-t border-[#F1F5F9] pt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Descrição</div>
                <p className="text-sm leading-relaxed text-[#475569]">{chamado.descricao}</p>
              </div>
            )}
          </section>
          {conduz && triado && <ServicoTerceiroForm chamado={chamado} />}
          <TimelineChamado chamado={chamado} somenteLeitura={!conduz} />
        </div>

        <div className="min-w-0 space-y-5">
          {atende && triado && <AlteracaoDeStatus key={`${chamado.id}:${chamado.status}:${chamado.motivoAguardando ?? ""}`} chamado={chamado} />}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-wide text-brand-navy">Situação</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="mb-1 text-xs text-[#94A3B8]">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={chamado.status} />
                  {chamado.motivoAguardando && <span className="text-xs text-slate-500">aguardando {ROTULO_DO_MOTIVO_AGUARDANDO[chamado.motivoAguardando]}</span>}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs text-[#94A3B8]">Prioridade efetiva</dt>
                <dd><PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} /></dd>
              </div>
              {classificacao ? (
                <div>
                  <dt className="mb-1 text-xs text-[#94A3B8]">Classificação calculada</dt>
                  <dd className="text-xs text-slate-600">
                    Severidade {ROTULO_PESO[classificacao.severidade]} ({classificacao.severidade}) + urgência {ROTULO_PESO[classificacao.urgencia]} ({classificacao.urgencia}) = score {classificacao.score} · {classificacao.prioridade}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="mb-1 text-xs text-[#94A3B8]">Prazo da triagem</dt>
                  <dd><PrazoDaTriagem triagem={triagem} /></dd>
                  {triagem.responsavel && <dd className="mt-1 text-xs text-slate-500">Em triagem com {triagem.responsavel.nome}</dd>}
                </div>
              )}
              {triagem.concluidaEm && (
                <div>
                  <dt className="mb-1 text-xs text-[#94A3B8]">Triagem</dt>
                  <dd className="text-xs text-slate-600">
                    Concluída por {triagem.concluidaPor?.nome ?? "—"} em {formatarDataHora(triagem.concluidaEm)}
                  </dd>
                </div>
              )}
              {chamado.override && (
                <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  Override para {chamado.override.prioridade} por {chamado.override.autor.nome}: “{chamado.override.justificativa}”
                </div>
              )}
              <div>
                <dt className="mb-1 text-xs text-[#94A3B8]">Departamento responsável</dt>
                <dd className="font-semibold text-brand-dark">{chamado.departamento?.nome ?? "Não definido"}</dd>
              </div>
              {triado && (
                <div>
                  <dt className="mb-1 text-xs text-[#94A3B8]">Responsável pelo atendimento</dt>
                  <dd className="flex items-center gap-1.5 font-semibold text-brand-dark">
                    {atendimento ? (
                      <><UserCheck size={14} className="text-brand-green" aria-hidden /> {ehMeu ? "Você" : atendimento.responsavel.nome}</>
                    ) : <span className="font-normal text-slate-500">Ninguém assumiu ainda</span>}
                  </dd>
                  {atendimento && <dd className="mt-0.5 text-xs text-slate-500">desde {formatarDataHora(atendimento.assumidoEm)}</dd>}
                </div>
              )}
            </dl>
          </section>
          {chamado.sla && chamado.status !== "Fechado" && (
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5" aria-label="SLA do chamado">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-brand-navy">SLA</h3>
              <SlaDoChamado sla={chamado.sla} />
            </section>
          )}
          <LocalizacaoDoChamado chamado={chamado} somenteLeitura={!conduz} />
          <AnexosDoChamado chamado={chamado} somenteLeitura={!conduz} />
        </div>
      </div>
    </main>
  );
}

export default function DetalhesChamado({ id }: { id: string }) {
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const ehClienteSemCentral = !usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL) && usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE);

  useEffect(() => {
    if (ehClienteSemCentral) router.replace(`/portal/chamados/${encodeURIComponent(id)}`);
  }, [ehClienteSemCentral, id, router]);

  if (ehClienteSemCentral) return null;
  return (
    <PerfilRequerido perfis={PERFIS_DA_CENTRAL}>
      <ComChamado id={id}>{(chamado) => <DetalhesConteudo key={chamado.id} chamado={chamado} />}</ComChamado>
    </PerfilRequerido>
  );
}
