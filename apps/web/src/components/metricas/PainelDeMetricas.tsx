"use client";

import { useState } from "react";
import { Download, Hourglass } from "lucide-react";
import { CODIGOS_PRIORIDADE, TIPOS_CHAMADO, type CodigoPrioridade, type IndicadorMetrica, type TipoChamado } from "@/types/chamado";
import type { FiltrosMetricas } from "@/services/api/contratos";
import { exportarMetricas } from "@/services/api/operacao";
import { useApi } from "@/store/AuthContext";
import { useFornecedores, useMetricas } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { APARENCIA_DA_PRIORIDADE } from "@/components/ui/StatusBadge";
import { AvisoDeErro, Carregando, FalhaAoCarregar, mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO, ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { formatarDuracao, hojeNaOperacao } from "@/utils/date";
import { PERFIS_DE_METRICAS } from "@/utils/perfis";

const DIAS_DO_PERIODO_PADRAO = 30;
const campoClass = "alvo-toque w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue";

function valorFormatado(indicador: IndicadorMetrica) {
  if (indicador.valor === null) return "Sem dados no período";
  if (indicador.unidade === "minutos") return formatarDuracao(indicador.valor);
  if (indicador.unidade === "percentual") return `${indicador.valor.toLocaleString("pt-BR")}%`;
  return indicador.valor.toLocaleString("pt-BR");
}

function CartaoDeIndicador({ indicador }: { indicador: IndicadorMetrica }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{indicador.rotulo}</div>
      {indicador.pendenteDeLevantamento ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          <Hourglass size={12} aria-hidden /> Pendente de levantamento
        </div>
      ) : (
        <div className="mt-1 font-display text-2xl font-bold text-brand-navy">{valorFormatado(indicador)}</div>
      )}
      <p className="mt-2 text-xs text-slate-500">{indicador.observacao}</p>
    </div>
  );
}

function ConteudoDasMetricas() {
  const api = useApi();
  const fornecedores = useFornecedores();
  const [filtros, setFiltros] = useState<FiltrosMetricas>({ de: hojeNaOperacao(-DIAS_DO_PERIODO_PADRAO), ate: hojeNaOperacao() });
  const [exportando, setExportando] = useState(false);
  const [erroDeExportacao, setErroDeExportacao] = useState<string | null>(null);
  const metricas = useMetricas(filtros);
  const periodoInvalido = filtros.de > filtros.ate;

  async function exportar() {
    setExportando(true);
    setErroDeExportacao(null);
    try {
      const arquivo = await exportarMetricas(api, filtros);
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `metricas-viaflux-${filtros.de}-a-${filtros.ate}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (falha) {
      setErroDeExportacao(mensagemDeErro(falha));
    } finally {
      setExportando(false);
    }
  }

  const total = metricas.data?.totalChamados ?? 0;

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">Métricas operacionais</h1>
          <p className="text-sm text-slate-500">Calculadas a partir do histórico dos chamados e dos fornecedores. A exportação não inclui dados pessoais.</p>
        </div>
        <button type="button" onClick={exportar} disabled={exportando || periodoInvalido} className="alvo-toque inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          <Download size={14} aria-hidden /> {exportando ? "Exportando…" : "Exportar CSV"}
        </button>
      </div>
      {erroDeExportacao && <div className="mb-4"><AvisoDeErro erro={new Error(erroDeExportacao)} /></div>}

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-semibold text-slate-500">De
          <input type="date" className={campoClass} value={filtros.de} max={filtros.ate} onChange={(evento) => setFiltros({ ...filtros, de: evento.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-500">Até
          <input type="date" className={campoClass} value={filtros.ate} min={filtros.de} onChange={(evento) => setFiltros({ ...filtros, ate: evento.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-500">Prioridade
          <select className={campoClass} value={filtros.prioridade ?? ""} onChange={(evento) => setFiltros({ ...filtros, prioridade: (evento.target.value || undefined) as CodigoPrioridade | undefined })}>
            <option value="">Todas</option>
            {CODIGOS_PRIORIDADE.map((codigo) => <option key={codigo} value={codigo}>{codigo} · {ROTULO_PRIORIDADE[codigo]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">Tipo
          <select className={campoClass} value={filtros.tipo ?? ""} onChange={(evento) => setFiltros({ ...filtros, tipo: (evento.target.value || undefined) as TipoChamado | undefined })}>
            <option value="">Todos</option>
            {TIPOS_CHAMADO.map((tipo) => <option key={tipo} value={tipo}>{NOME_TIPO[tipo]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">Departamento
          <select className={campoClass} value={filtros.departamento ?? ""} onChange={(evento) => setFiltros({ ...filtros, departamento: (evento.target.value || undefined) as TipoChamado | undefined })}>
            <option value="">Todos</option>
            {TIPOS_CHAMADO.map((tipo) => <option key={tipo} value={tipo}>{NOME_TIPO[tipo]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">Fornecedor
          <select className={campoClass} value={filtros.fornecedor ?? ""} onChange={(evento) => setFiltros({ ...filtros, fornecedor: evento.target.value || undefined })}>
            <option value="">Todos</option>
            {fornecedores.data?.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}
          </select>
        </label>
      </div>

      {periodoInvalido ? <AvisoDeErro erro={new Error("A data inicial deve ser anterior ou igual à final.")} /> : metricas.isPending ? <Carregando texto="Calculando métricas…" /> : metricas.isError ? (
        <FalhaAoCarregar erro={metricas.error} aoTentarDeNovo={() => void metricas.refetch()} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4" aria-labelledby="distribuicao">
            <h2 id="distribuicao" className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Distribuição por prioridade · {total} chamados</h2>
            <div className="space-y-2">
              {CODIGOS_PRIORIDADE.map((codigo) => {
                const quantidade = metricas.data.distribuicaoPorPrioridade[codigo];
                const proporcao = total === 0 ? 0 : (quantidade / total) * 100;
                const { texto } = APARENCIA_DA_PRIORIDADE[codigo];
                return (
                  <div key={codigo} className="flex items-center gap-3 text-xs">
                    <span className="w-24 flex-shrink-0 font-semibold" style={{ color: texto }}>{codigo} · {ROTULO_PRIORIDADE[codigo]}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${proporcao}%`, background: texto }} /></span>
                    <span className="w-16 text-right text-slate-600">{quantidade} ({Math.round(proporcao)}%)</span>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricas.data.indicadores.map((indicador) => <CartaoDeIndicador key={indicador.chave} indicador={indicador} />)}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PainelDeMetricas() {
  return <PerfilRequerido perfis={PERFIS_DE_METRICAS}><ConteudoDasMetricas /></PerfilRequerido>;
}
