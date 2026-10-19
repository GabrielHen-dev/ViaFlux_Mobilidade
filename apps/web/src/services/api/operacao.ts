import type { Chamado, Fornecedor, Metricas, Notificacao, ServicoDoFornecedor, Solicitante } from "@/types/chamado";
import type { DadosAtualizacaoServico, DadosVinculoServico, FiltrosMetricas } from "@/services/api/contratos";
import { type ClienteApi, paraConsulta } from "@/services/api/chamados";

export function listarSolicitantes(api: ClienteApi, busca: string) {
  return api.requisitar<Solicitante[]>(`/api/solicitantes${paraConsulta({ busca })}`);
}

export function listarFornecedores(api: ClienteApi) {
  return api.requisitar<Fornecedor[]>("/api/fornecedores");
}

export function vincularServico(api: ClienteApi, codigo: string, dados: DadosVinculoServico) {
  return api.requisitar<Chamado>(`/api/chamados/${encodeURIComponent(codigo)}/servicos`, { method: "POST", body: JSON.stringify(dados) });
}

export function cancelarServico(api: ClienteApi, codigo: string, servicoId: string) {
  return api.requisitar<void>(`/api/chamados/${encodeURIComponent(codigo)}/servicos/${encodeURIComponent(servicoId)}`, { method: "DELETE" });
}

export function listarServicosDoFornecedor(api: ClienteApi) {
  return api.requisitar<ServicoDoFornecedor[]>("/api/fornecedor/servicos");
}

export function atualizarServicoDoFornecedor(api: ClienteApi, servicoId: string, dados: DadosAtualizacaoServico) {
  return api.requisitar<ServicoDoFornecedor>(`/api/fornecedor/servicos/${encodeURIComponent(servicoId)}/status`, { method: "PATCH", body: JSON.stringify(dados) });
}

export function listarNotificacoes(api: ClienteApi) {
  return api.requisitar<Notificacao[]>("/api/notificacoes");
}

export function marcarNotificacaoComoLida(api: ClienteApi, id: string) {
  return api.requisitar<void>(`/api/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" });
}

export function marcarTodasComoLidas(api: ClienteApi) {
  return api.requisitar<void>("/api/notificacoes/leitura", { method: "POST" });
}

export function consultarMetricas(api: ClienteApi, filtros: FiltrosMetricas) {
  return api.requisitar<Metricas>(`/api/metricas${paraConsulta(filtros)}`);
}

export function exportarMetricas(api: ClienteApi, filtros: FiltrosMetricas) {
  return api.baixar(`/api/metricas/exportacao${paraConsulta(filtros)}`);
}
