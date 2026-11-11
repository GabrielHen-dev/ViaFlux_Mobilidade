"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Ban, ChevronLeft, ClipboardCheck, ClipboardList, Clock, EllipsisVertical, Hand, Printer, ScanSearch, UserCheck } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import { assumirAtendimento } from "@/services/api/chamados";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { useAcaoNoChamado } from "@/hooks/consultas";
import ComChamado from "@/components/chamados/ComChamado";
import AlteracaoDeStatus from "@/components/chamados/AlteracaoDeStatus";
import ChatDoChamado from "@/components/chamados/ChatDoChamado";
import AnexosDoChamado from "@/components/chamados/AnexosDoChamado";
import LocalizacaoDoChamado from "@/components/chamados/LocalizacaoDoChamado";
import ServicoTerceiroForm from "@/components/forms/ServicoTerceiroForm";
import Triagem from "@/components/forms/Triagem";
import Encaminhamento from "@/components/forms/Encaminhamento";
import AcompanhamentoTerceiro from "@/components/chamados/AcompanhamentoTerceiro";
import { DentroDoPainelLateral } from "@/components/layout/RaizDaPagina";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { Badge } from "@/components/ui/Badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { SlaDoChamado } from "@/components/ui/SlaIndicador";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { DialogoDeEscalonamento, SeloDeEscalonamento, BotaoDeEscalonamento, podeEscalonar } from "@/components/chamados/EscalonamentoDoChamado";
import { AvisoDeCancelamento, BotaoDeCancelamento, podeCancelar } from "@/components/chamados/CancelamentoDoChamado";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO, ROTULO_PESO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";
import { origemDaClassificacao, partesDoRelato, termosReconhecidos, type OrigemDaClassificacao } from "@/utils/classificacao";
import { cn } from "@/utils/cn";
import {
  PERFIS_DA_CENTRAL, PERFIS_DE_CLIENTE, PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, PERFIS_QUE_CONDUZEM, usuarioTemPerfil,
} from "@/utils/perfis";
import PerfilRequerido from "@/components/auth/PerfilRequerido";

const STATUS_QUE_PODEM_SER_ASSUMIDOS = ["Na fila", "Em atendimento", "Aguardando"];

export const ROTULO_DO_MOTIVO_AGUARDANDO = { CLIENTE: "cliente", FORNECEDOR: "fornecedor", OUTRO_DEPARTAMENTO: "outro departamento" } as const;

export type PainelDoChamado = "triagem" | "encaminhamento" | "acompanhamento";

const TITULO_DO_PAINEL: Record<PainelDoChamado, string> = {
  triagem: "Classificação",
  encaminhamento: "Transferência e status",
  acompanhamento: "Serviço terceirizado",
};

const SELO_DA_ORIGEM: Record<OrigemDaClassificacao, { rotulo: string; tom: "neutro" | "acao" | "alerta" | "destaque" }> = {
  PENDENTE: { rotulo: "Aguardando classificação", tom: "alerta" },
  CATALOGO: { rotulo: "Automática · catálogo", tom: "acao" },
  RELATO: { rotulo: "Automática · relato", tom: "destaque" },
  MANUAL: { rotulo: "Manual", tom: "neutro" },
};

function Informacao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-tinta-apagada">{rotulo}</div>
      <div className="break-words text-sm font-medium text-tinta">{valor || "—"}</div>
    </div>
  );
}

function RelatoComDestaques({ texto, termos }: { texto: string; termos: string[] }) {
  return (
    <p className="text-sm leading-relaxed text-tinta-suave">
      {partesDoRelato(texto, termos).map((parte, indice) => parte.destaque
        ? <mark key={indice} className="rounded-sm bg-[#FFE7A3] px-0.5 text-tinta">{parte.trecho}</mark>
        : <span key={indice}>{parte.trecho}</span>)}
    </p>
  );
}

function ReguasDePrazo({ chamado }: { chamado: Chamado }) {
  const { triagem } = chamado;
  const cancelado = chamado.status === "Cancelado";
  return (
    <section id="prazos-do-chamado" className="vf-cartao scroll-mt-20" aria-label="Prazos do chamado">
      <div className="border-b border-linha px-4 py-3 text-sm font-medium text-tinta">Prazos</div>
      <ol className="space-y-4 p-4">
        <li>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-tinta"><span className="mr-1 text-tinta-apagada">1.</span> Análise</span>
            <span className="text-xs text-tinta-apagada">{triagem.prazoMinutos} min</span>
          </div>
          {triagem.concluidaEm ? (
            <p className="text-xs text-tinta-suave">Concluída em {formatarDataHora(triagem.concluidaEm)} · {triagem.concluidaPor?.nome ?? "—"}</p>
          ) : <PrazoDaTriagem triagem={triagem} />}
        </li>
        <li className="border-t border-linha pt-4">
          <div className="mb-1.5 text-xs font-medium text-tinta"><span className="mr-1 text-tinta-apagada">2.</span> Atendimento (SLA)</div>
          {chamado.sla && chamado.status !== "Fechado" && !cancelado ? (
            <div className="space-y-3">
              <SlaDoChamado sla={chamado.sla} abertura={chamado.abertura} />
              <SeloDeEscalonamento chamado={chamado} detalhado />
            </div>
          ) : (
            <p className="text-xs text-tinta-apagada">{chamado.sla ? "Encerrado." : "Começa depois da análise."}</p>
          )}
        </li>
      </ol>
    </section>
  );
}

function MenuDeOpcoes({ chamado, podeEscalonarAqui, podeCancelarAqui }: { chamado: Chamado; podeEscalonarAqui: boolean; podeCancelarAqui: boolean }) {
  const [escalonando, setEscalonando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="vf-botao-secundario alvo-toque inline-flex items-center gap-1.5 px-3 py-2">
          Opções <EllipsisVertical size={14} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {podeEscalonarAqui && (
            <DropdownMenuItem onSelect={() => setEscalonando(true)}><ArrowUpRight size={15} aria-hidden /> Escalonar à liderança</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => document.getElementById("prazos-do-chamado")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <Clock size={15} aria-hidden /> Detalhes do SLA
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.print()}><Printer size={15} aria-hidden /> Imprimir</DropdownMenuItem>
          {podeCancelarAqui && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem perigo onSelect={() => setCancelando(true)}><Ban size={15} aria-hidden /> Cancelar chamado</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {escalonando && <DialogoDeEscalonamento chamado={chamado} aoFechar={() => setEscalonando(false)} />}
      {podeCancelarAqui && <BotaoDeCancelamento chamado={chamado} controle={{ aberto: cancelando, aoMudar: setCancelando }} />}
    </>
  );
}

function DetalhesConteudo({ chamado, painel }: { chamado: Chamado; painel?: PainelDoChamado }) {
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const fazTriagem = usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM);
  const conduz = usuarioTemPerfil(usuario, PERFIS_QUE_CONDUZEM);
  const atende = usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM);
  const { classificacao, triagem, atendimento } = chamado;
  const triado = classificacao !== null;
  const cancelado = chamado.status === "Cancelado";
  const editavel = conduz && !cancelado;
  const responsavel = atendimento?.responsavel ?? null;
  const ehMeu = responsavel?.id === usuario.id;
  const podeAssumir = atende && triado && STATUS_QUE_PODEM_SER_ASSUMIDOS.includes(chamado.status) && !(ehMeu && chamado.status === "Em atendimento");
  const assumeNoLugar = chamado.status === "Em atendimento" && responsavel !== null && !ehMeu;
  const assumir = useAcaoNoChamado<void>(chamado.id, (cliente) => assumirAtendimento(cliente, chamado.id));
  const [painelFechado, setPainelFechado] = useState(false);
  const origem = origemDaClassificacao(chamado);
  const termos = triagem.revisaoPendente ? termosReconhecidos(chamado) : [];
  const relato = chamado.descricao || chamado.motivoOutro || "";

  return (
    <main id="conteudo" className="min-w-0 vf-pagina">
      <div className="vf-cabecalho-pagina mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Link href="/" aria-label="Voltar ao Dashboard" className="alvo-toque flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-linha text-tinta-suave transition-all hover:bg-fundo">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-tinta">#{chamado.id}</h1>
              <StatusBadge status={chamado.status} />
              <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
            </div>
            <p className="text-sm text-tinta-suave">
              <span className="font-medium text-tinta">{chamado.departamento?.nome ?? (triado ? "Sem departamento" : "Aguardando classificação")}</span> · Aberto em {formatarDataHora(chamado.abertura)}
            </p>
          </div>
        </div>
        {(conduz || atende) && (
          <div className="flex flex-wrap gap-2">
            {podeAssumir && (
              <button type="button" disabled={assumir.isPending} onClick={() => assumir.mutate()} className="vf-botao-primario alvo-toque inline-flex items-center gap-1.5 px-4 py-2">
                <Hand size={14} aria-hidden /> {assumir.isPending ? "Assumindo…" : assumeNoLugar ? `Assumir no lugar de ${responsavel?.nome}` : "Assumir chamado"}
              </button>
            )}
            {fazTriagem && !triado && !cancelado && (
              <Link href={`/chamados/${chamado.id}/triagem`} className="vf-botao-primario alvo-toque inline-flex items-center gap-1.5 px-4 py-2">
                <ClipboardList size={14} aria-hidden /> Classificar
              </Link>
            )}
            {fazTriagem && triado && !cancelado && (
              <Link href={`/chamados/${chamado.id}/triagem`} className="vf-botao-secundario alvo-toque inline-flex items-center px-4 py-2">Classificação</Link>
            )}
            {triado && editavel && (
              <Link href={`/chamados/${chamado.id}/encaminhamento`} className="vf-botao-secundario alvo-toque inline-flex items-center px-4 py-2">
                {atende ? "Transferir / status" : "Transferir"}
              </Link>
            )}
            <MenuDeOpcoes chamado={chamado} podeEscalonarAqui={atende && !cancelado && podeEscalonar(chamado)} podeCancelarAqui={conduz && podeCancelar(chamado)} />
          </div>
        )}
      </div>
      {assumir.isError && <div className="mb-4"><AvisoDeErro erro={assumir.error} /></div>}
      <AvisoDeCancelamento chamado={chamado} podeReabrir={conduz}>
        {atende && <BotaoDeEscalonamento chamado={chamado} />}
        <SeloDeEscalonamento chamado={chamado} detalhado />
      </AvisoDeCancelamento>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 lg:order-2">
          {fazTriagem && triagem.revisaoPendente && !cancelado && (
            <div role="status" className="flex flex-col gap-3 rounded border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-amber-600"><ScanSearch size={18} aria-hidden /></span>
              <div className="min-w-0 flex-1 text-sm text-amber-900">
                <p className="font-medium">Classificação automática pendente de revisão</p>
                <p className="mt-0.5 text-amber-800">
                  Classificado a partir do relato do solicitante. Confirme ou reclassifique.
                  {termos.length > 0 && <> Palavras reconhecidas: <strong>{termos.join(", ")}</strong>.</>}
                </p>
              </div>
              <Link href={`/chamados/${chamado.id}/triagem`} className="alvo-toque inline-flex items-center justify-center gap-1.5 rounded bg-amber-500 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-amber-600">
                <ClipboardCheck size={14} aria-hidden /> Revisar classificação
              </Link>
            </div>
          )}

          <section className="vf-cartao">
            <div className="border-b border-linha px-4 py-3"><h2 className="text-sm font-medium text-tinta">Solicitação</h2></div>
            <div className="p-4">
              {(chamado.motivo || chamado.motivoOutro) && (
                <div className="mb-4 rounded bg-fundo p-3 text-sm">
                  {chamado.motivo && <p><span className="font-medium text-tinta">Motivo:</span> {chamado.motivo.descricao}</p>}
                  {!chamado.motivo && chamado.motivoOutro && <p><span className="font-medium text-tinta">Motivo informado:</span> {chamado.motivoOutro}</p>}
                  {chamado.contexto && <p className="mt-1"><span className="font-medium text-tinta">Contexto:</span> {chamado.contexto.descricao}</p>}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Informacao rotulo="Cliente" valor={chamado.cliente} />
                <Informacao rotulo="Telefone" valor={chamado.telefone} />
                <Informacao rotulo="Veículo" valor={chamado.modelo} />
                <Informacao rotulo="Placa" valor={chamado.placa} />
                <Informacao rotulo="Tipo" valor={chamado.tipo ? NOME_TIPO[chamado.tipo] : "Aguardando classificação"} />
                <Informacao rotulo="Última atualização" valor={formatarDataHora(chamado.atualizadoEm)} />
              </div>
              {chamado.descricao && (
                <div className="mt-4 border-t border-linha pt-4">
                  <div className="mb-1.5 text-xs text-tinta-apagada">Descrição</div>
                  <RelatoComDestaques texto={chamado.descricao} termos={termos} />
                </div>
              )}
              {!chamado.descricao && relato && termos.length > 0 && (
                <div className="mt-4 border-t border-linha pt-4"><RelatoComDestaques texto={relato} termos={termos} /></div>
              )}
            </div>
          </section>

          <ChatDoChamado chamado={chamado} somenteLeitura={!conduz} eventos={chamado.timeline.filter((evento) => evento.tipo !== "ATUALIZACAO")} />
          <AnexosDoChamado chamado={chamado} somenteLeitura={!conduz} />
        </div>

        <div className="min-w-0 space-y-4 lg:order-1">
          <section className="vf-cartao" aria-labelledby="titulo-classificacoes">
            <div className="flex items-center justify-between gap-2 border-b border-linha px-4 py-3">
              <h2 id="titulo-classificacoes" className="text-sm font-medium text-tinta">Classificações</h2>
              <Badge tom={SELO_DA_ORIGEM[origem].tom}>{SELO_DA_ORIGEM[origem].rotulo}</Badge>
            </div>
            <dl className="space-y-3 p-4 text-sm">
              <div>
                <dt className="mb-1 text-xs text-tinta-apagada">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={chamado.status} />
                  {chamado.motivoAguardando && <span className="text-xs text-tinta-suave">aguardando {ROTULO_DO_MOTIVO_AGUARDANDO[chamado.motivoAguardando]}</span>}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs text-tinta-apagada">Prioridade efetiva</dt>
                <dd><PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} /></dd>
              </div>
              {classificacao ? (
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Classificação calculada</dt>
                  <dd className="text-xs text-tinta-suave">
                    Severidade {ROTULO_PESO[classificacao.severidade]} ({classificacao.severidade}) + urgência {ROTULO_PESO[classificacao.urgencia]} ({classificacao.urgencia}) = score {classificacao.score} · {classificacao.prioridade}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Prazo de classificação</dt>
                  <dd><PrazoDaTriagem triagem={triagem} /></dd>
                  {triagem.responsavel && <dd className="mt-1 text-xs text-tinta-suave">Em análise com {triagem.responsavel.nome}</dd>}
                </div>
              )}
              {triagem.concluidaEm && (
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Classificação</dt>
                  <dd className="text-xs text-tinta-suave">
                    {triagem.concluidaPor?.nome ?? "—"} · {formatarDataHora(triagem.concluidaEm)}
                    {triagem.revisaoPendente && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">revisão pendente</span>}
                  </dd>
                </div>
              )}
              {chamado.override && (
                <div className="rounded bg-amber-50 p-2 text-xs text-amber-800">
                  Prioridade manual {chamado.override.prioridade} · {chamado.override.autor.nome}: “{chamado.override.justificativa}”
                </div>
              )}
              <div>
                <dt className="mb-1 text-xs text-tinta-apagada">Departamento responsável</dt>
                <dd className="font-medium text-tinta">{chamado.departamento?.nome ?? "Não definido"}</dd>
              </div>
              {triado && (
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Responsável pelo atendimento</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-tinta">
                    {atendimento ? (
                      <><UserCheck size={14} className="text-[var(--vf-sucesso)]" aria-hidden /> {ehMeu ? "Você" : atendimento.responsavel.nome}</>
                    ) : <span className="font-normal text-tinta-suave">Ninguém assumiu ainda</span>}
                  </dd>
                  {atendimento && <dd className="mt-0.5 text-xs text-tinta-suave">desde {formatarDataHora(atendimento.assumidoEm)}</dd>}
                </div>
              )}
            </dl>
            {fazTriagem && !cancelado && (
              <div className={cn("flex flex-wrap gap-2 border-t border-linha px-4 py-3")}>
                <Link href={`/chamados/${chamado.id}/triagem`} className="text-xs font-medium text-acao hover:underline">
                  {!triado ? "Abrir análise" : triagem.revisaoPendente ? "Confirmar ou ajustar" : "Reclassificar ou mudar prioridade"}
                </Link>
              </div>
            )}
          </section>
          {atende && triado && !cancelado && <AlteracaoDeStatus key={`${chamado.id}:${chamado.status}:${chamado.motivoAguardando ?? ""}`} chamado={chamado} />}
          <ReguasDePrazo chamado={chamado} />
          {editavel && triado && <ServicoTerceiroForm chamado={chamado} />}
          <LocalizacaoDoChamado chamado={chamado} somenteLeitura={!editavel} />
        </div>
      </div>

      <Sheet open={painel !== undefined && !painelFechado} onOpenChange={(aberto) => { if (!aberto) { setPainelFechado(true); router.push(`/chamados/${chamado.id}`); } }}>
        {painel && !painelFechado && (
          <SheetContent titulo={TITULO_DO_PAINEL[painel]} rotuloDoFechar="Fechar e voltar ao chamado" aoSeguirLink={(destino) => { if (!destino.includes(`/chamados/${chamado.id}/`)) setPainelFechado(true); }}>
            <DentroDoPainelLateral.Provider value={true}>
              {painel === "triagem" && <Triagem id={chamado.id} />}
              {painel === "encaminhamento" && <Encaminhamento id={chamado.id} />}
              {painel === "acompanhamento" && <AcompanhamentoTerceiro id={chamado.id} />}
            </DentroDoPainelLateral.Provider>
          </SheetContent>
        )}
      </Sheet>
    </main>
  );
}

export default function DetalhesChamado({ id, painel }: { id: string; painel?: PainelDoChamado }) {
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const ehClienteSemCentral = !usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL) && usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE);

  useEffect(() => {
    if (ehClienteSemCentral) router.replace(`/portal/chamados/${encodeURIComponent(id)}`);
  }, [ehClienteSemCentral, id, router]);

  if (ehClienteSemCentral) return null;
  return (
    <PerfilRequerido perfis={PERFIS_DA_CENTRAL}>
      <ComChamado id={id}>{(chamado) => <DetalhesConteudo key={chamado.id} chamado={chamado} painel={painel} />}</ComChamado>
    </PerfilRequerido>
  );
}
