"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoveRight } from "lucide-react";
import { MOTIVOS_AGUARDANDO, type ChamadoResumo, type MotivoAguardando, type Status } from "@/types/chamado";
import type { DadosStatus } from "@/services/api/contratos";
import { alterarStatus } from "@/services/api/chamados";
import { useApi } from "@/store/AuthContext";
import { chaves, invalidarListas } from "@/hooks/consultas";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { APARENCIA_DA_PRIORIDADE, PrioridadeIndicador } from "@/components/ui/StatusBadge";
import { SlaResumo } from "@/components/ui/SlaIndicador";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { cn } from "@/utils/cn";

const COLUNAS: { status: Status; titulo: string; recebe: boolean }[] = [
  { status: "Em triagem", titulo: "Em análise", recebe: false },
  { status: "Na fila", titulo: "Na fila", recebe: true },
  { status: "Em atendimento", titulo: "Em atendimento", recebe: true },
  { status: "Aguardando", titulo: "Aguardando", recebe: true },
  { status: "Resolvido", titulo: "Resolvido", recebe: true },
  { status: "Fechado", titulo: "Fechado", recebe: true },
];

const ROTULO_DO_AGUARDANDO: Record<MotivoAguardando, string> = { CLIENTE: "Cliente", FORNECEDOR: "Fornecedor", OUTRO_DEPARTAMENTO: "Outro departamento" };
const TAMANHO_MINIMO_DO_RESUMO = 10;

function colunaDo(chamado: ChamadoResumo): Status {
  return chamado.status === "Aberto" ? "Em triagem" : chamado.status;
}

export function destinosPermitidos(chamado: ChamadoResumo): Status[] {
  if (chamado.prioridade === null || chamado.status === "Cancelado" || chamado.status === "Fechado") return [];
  if (chamado.status === "Resolvido") return ["Fechado"];
  return (["Na fila", "Em atendimento", "Aguardando", "Resolvido"] as Status[]).filter((status) => status !== chamado.status);
}

interface Movimento {
  chamado: ChamadoResumo;
  destino: Status;
}

function CartaoDoChamado({ chamado, podeMover, aoMover }: { chamado: ChamadoResumo; podeMover: boolean; aoMover: (destino: Status) => void }) {
  const destinos = podeMover ? destinosPermitidos(chamado) : [];
  const cor = chamado.prioridade ? APARENCIA_DA_PRIORIDADE[chamado.prioridade].texto : "#C9CED6";

  function iniciarArraste(evento: DragEvent<HTMLLIElement>) {
    evento.dataTransfer.setData("text/plain", chamado.id);
    evento.dataTransfer.effectAllowed = "move";
  }

  return (
    <li
      draggable={destinos.length > 0}
      onDragStart={iniciarArraste}
      className={cn("rounded border border-linha bg-white p-2.5 shadow-sm", destinos.length > 0 && "cursor-grab active:cursor-grabbing")}
      style={{ borderLeft: `4px solid ${cor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/chamados/${chamado.id}`} className="text-sm font-medium text-acao hover:underline">#{chamado.id}</Link>
        {destinos.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`Mover chamado ${chamado.id}`} className="alvo-toque flex h-6 w-6 items-center justify-center rounded text-tinta-apagada hover:bg-fundo hover:text-tinta">
              <MoveRight size={14} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {destinos.map((destino) => <DropdownMenuItem key={destino} onSelect={() => aoMover(destino)}>{destino}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium text-tinta">{chamado.cliente}</p>
      <p className="truncate text-xs text-tinta-apagada">{[chamado.modelo, chamado.placa].filter(Boolean).join(" · ") || "Sem veículo"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PrioridadeIndicador prioridade={chamado.prioridade} />
        {chamado.sla && <SlaResumo sla={chamado.sla} />}
      </div>
      {chamado.atendimento && <p className="mt-1.5 truncate text-[11px] text-tinta-apagada">com {chamado.atendimento.responsavel.nome}</p>}
    </li>
  );
}

function DialogoDoMovimento({ movimento, enviando, aoConfirmar, aoFechar }: {
  movimento: Movimento;
  enviando: boolean;
  aoConfirmar: (dados: DadosStatus) => void;
  aoFechar: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoAguardando | "">("");
  const [resumo, setResumo] = useState("");
  const { chamado, destino } = movimento;
  const aguardando = destino === "Aguardando";
  const valido = aguardando ? motivo !== "" : resumo.trim().length >= TAMANHO_MINIMO_DO_RESUMO;

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) aoFechar(); }}>
      <DialogContent titulo={`Mover #${chamado.id} para ${destino}`} descricao={aguardando ? "Informe de quem o chamado depende." : "Registre a solução aplicada."}>
        <div className="space-y-4">
          {aguardando ? (
            <fieldset>
              <legend className="mb-1.5 text-xs text-tinta-suave">Aguardando quem? *</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MOTIVOS_AGUARDANDO.map((valor) => (
                  <label key={valor} className={cn("alvo-toque flex cursor-pointer items-center justify-center rounded border px-3 py-2 text-sm", motivo === valor ? "border-acao bg-acao-suave font-medium text-acao" : "border-linha-forte text-tinta-suave")}>
                    <input type="radio" name={`kanban-aguardando-${chamado.id}`} className="sr-only" checked={motivo === valor} onChange={() => setMotivo(valor)} />
                    {ROTULO_DO_AGUARDANDO[valor]}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <div>
              <label htmlFor={`kanban-resumo-${chamado.id}`} className="mb-1.5 block text-xs text-tinta-suave">Resumo da solução *</label>
              <textarea
                id={`kanban-resumo-${chamado.id}`}
                rows={4}
                maxLength={5000}
                value={resumo}
                onChange={(evento) => setResumo(evento.target.value)}
                className="w-full resize-none rounded border border-linha-forte px-3 py-2 text-sm outline-none focus:border-acao"
              />
              <p className="mt-1 text-xs text-tinta-apagada">Mínimo de {TAMANHO_MINIMO_DO_RESUMO} caracteres.</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={aoFechar} className="vf-botao-secundario alvo-toque px-4 py-2">Voltar</button>
            <button
              type="button"
              disabled={!valido || enviando}
              onClick={() => aoConfirmar({ status: destino, motivoAguardando: aguardando ? motivo as MotivoAguardando : null, resumoResolucao: aguardando ? undefined : resumo.trim() })}
              className="vf-botao-primario alvo-toque px-4 py-2"
            >
              {enviando ? "Movendo…" : "Mover"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuadroKanban({ chamados, podeMover }: { chamados: ChamadoResumo[]; podeMover: boolean }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [pendente, setPendente] = useState<Movimento | null>(null);
  const [alvo, setAlvo] = useState<Status | null>(null);
  const mudanca = useMutation({
    mutationFn: ({ codigo, dados }: { codigo: string; dados: DadosStatus }) => alterarStatus(api, codigo, dados),
    onSuccess: (atualizado) => {
      clienteDeConsultas.setQueryData(chaves.detalhe(atualizado.id), atualizado);
      void invalidarListas(clienteDeConsultas);
      toast.success("Status atualizado", { description: `#${atualizado.id} agora está ${atualizado.status}.` });
      setPendente(null);
    },
    onError: (erro) => toast.error("Não foi possível mover o chamado", { description: mensagemDeErro(erro) }),
  });

  function mover(chamado: ChamadoResumo, destino: Status) {
    if (!destinosPermitidos(chamado).includes(destino)) {
      toast.error(`#${chamado.id} não pode ir para ${destino}.`);
      return;
    }
    if (destino === "Aguardando" || destino === "Resolvido") {
      setPendente({ chamado, destino });
      return;
    }
    mudanca.mutate({ codigo: chamado.id, dados: { status: destino } });
  }

  function soltar(evento: DragEvent<HTMLElement>, destino: Status) {
    evento.preventDefault();
    setAlvo(null);
    const chamado = chamados.find((item) => item.id === evento.dataTransfer.getData("text/plain"));
    if (chamado && colunaDo(chamado) !== destino) mover(chamado, destino);
  }

  return (
    <>
      <div className="overflow-x-auto p-3">
        <div className="grid min-w-[1080px] grid-cols-6 gap-3">
          {COLUNAS.map((coluna) => {
            const itens = chamados.filter((chamado) => colunaDo(chamado) === coluna.status);
            return (
              <section
                key={coluna.status}
                aria-label={`Coluna ${coluna.titulo}`}
                onDragOver={(evento) => { if (podeMover && coluna.recebe) { evento.preventDefault(); setAlvo(coluna.status); } }}
                onDragLeave={() => setAlvo((atual) => (atual === coluna.status ? null : atual))}
                onDrop={(evento) => soltar(evento, coluna.status)}
                className={cn("flex min-h-64 flex-col rounded border bg-fundo", alvo === coluna.status ? "border-acao bg-acao-suave" : "border-linha")}
              >
                <div className="flex items-center justify-between border-b border-linha px-3 py-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-suave">{coluna.titulo}</h3>
                  <span className="rounded bg-white px-1.5 text-xs tabular-nums text-tinta-apagada">{itens.length}</span>
                </div>
                <ol className="flex-1 space-y-2 p-2">
                  {itens.map((chamado) => <CartaoDoChamado key={chamado.id} chamado={chamado} podeMover={podeMover} aoMover={(destino) => mover(chamado, destino)} />)}
                  {itens.length === 0 && <li className="py-6 text-center text-xs text-tinta-apagada">Sem chamados</li>}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
      {pendente && (
        <DialogoDoMovimento
          movimento={pendente}
          enviando={mudanca.isPending}
          aoConfirmar={(dados) => mudanca.mutate({ codigo: pendente.chamado.id, dados })}
          aoFechar={() => setPendente(null)}
        />
      )}
    </>
  );
}
