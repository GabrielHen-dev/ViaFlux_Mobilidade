import { Check } from "lucide-react";
import type { Chamado, Status } from "@/types/chamado";
import { formatarDataHora } from "@/utils/date";
import { cn } from "@/utils/cn";

const ETAPAS = ["Recebido", "Em análise", "Encaminhado", "Em atendimento", "Resolvido", "Fechado"] as const;

const ETAPA_DO_STATUS: Record<Status, number> = {
  "Aberto": 1,
  "Em triagem": 1,
  "Na fila": 2,
  "Em atendimento": 3,
  "Aguardando": 3,
  "Resolvido": 4,
  "Fechado": 5,
};

export default function EtapasDoChamado({ chamado }: { chamado: Chamado }) {
  const atual = ETAPA_DO_STATUS[chamado.status];
  const emAnalise = chamado.prioridade === null;
  return (
    <section aria-label="Andamento do chamado" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <ol className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
        {ETAPAS.map((etapa, indice) => {
          const concluida = indice < atual || (indice === atual && chamado.status === "Fechado");
          const corrente = indice === atual && !concluida;
          return (
            <li key={etapa} aria-current={corrente ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                concluida ? "border-brand-green bg-brand-green text-white" : corrente ? "border-brand-blue text-brand-blue" : "border-slate-200 text-slate-400")}>
                {concluida ? <Check size={14} strokeWidth={3} aria-hidden /> : indice + 1}
              </span>
              <span className={cn("text-[11px] leading-tight", corrente ? "font-semibold text-brand-dark" : "text-slate-500")}>{etapa}</span>
            </li>
          );
        })}
      </ol>
      {emAnalise && (
        <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
          A Central está analisando o seu chamado para definir a prioridade e o departamento responsável.{" "}
          {chamado.triagem.situacao === "VIOLADO"
            ? `A análise está levando mais tempo que o previsto (${formatarDataHora(chamado.triagem.limite)}), mas o seu chamado continua na fila.`
            : `Previsão de análise: até ${formatarDataHora(chamado.triagem.limite)}.`}
        </p>
      )}
      {chamado.departamento && !emAnalise && (
        <p className="mt-4 text-xs text-slate-500">Departamento responsável: <span className="font-semibold text-brand-dark">{chamado.departamento.nome}</span></p>
      )}
    </section>
  );
}
