import type { ClienteApi } from "@/services/api/chamados";
import { transferirChamado, definirOverride, consultarChamado } from "@/services/api/chamados";
import { listarFornecedores, vincularServico } from "@/services/api/operacao";
import type { TipoChamado } from "@/types/chamado";

export interface UsuarioDeExemplo {
  nome: string;
  email: string;
  perfis: string[];
  organizacao: string | null;
  departamentos: string[];
  cadastrado: boolean;
}

export interface EstadoDosDados {
  totalDeChamados: number;
  chamadosDeExemplo: number;
  senhaConfigurada: boolean;
  usuarios: UsuarioDeExemplo[];
}

export interface ResultadoDoSeed {
  organizacoesCriadas: number;
  usuariosCriados: number;
  chamadosCriados: number;
  protocolos: string[];
}

export interface ResultadoDaLimpeza {
  chamadosRemovidos: number;
  usuariosRemovidos: number;
  organizacoesRemovidas: number;
}

export function consultarEstadoDosDados(api: ClienteApi) {
  return api.requisitar<EstadoDosDados>("/api/dev/estado");
}

export function popularBanco(api: ClienteApi, quantidadeDeChamados: number) {
  return api.requisitar<ResultadoDoSeed>("/api/dev/seed", { method: "POST", body: JSON.stringify({ quantidadeDeChamados }) });
}

export function limparDadosDeExemplo(api: ClienteApi) {
  return api.requisitar<ResultadoDaLimpeza>("/api/dev/dados-de-exemplo", { method: "DELETE" });
}

const DESTINO_DA_TRANSFERENCIA: Partial<Record<TipoChamado, TipoChamado>> = {
  ASSISTENCIA_24H: "MANUTENCAO",
  TI: "CONTRATOS",
};

export async function enriquecerComDadosSimulados(api: ClienteApi, protocolos: string[]) {
  const fornecedores = await listarFornecedores(api);
  const guincho = fornecedores.find((fornecedor) => fornecedor.nome === "Guincho ViaRápido") ?? fornecedores[0];
  const chamados = await Promise.all(protocolos.map((protocolo) => consultarChamado(api, protocolo)));
  const abertos = chamados.filter((chamado) => chamado.status !== "Resolvido" && chamado.status !== "Fechado");
  const acoes: string[] = [];

  const paraGuincho = abertos.filter((chamado) => chamado.tipo === "ASSISTENCIA_24H").slice(0, 2);
  for (const chamado of paraGuincho) {
    if (!guincho) break;
    await vincularServico(api, chamado.id, { fornecedorId: guincho.id, tipoServico: "Remoção do veículo", local: chamado.localizacao, observacao: "Gerado pelo /dev-tools" });
    acoes.push(`${chamado.id}: serviço acionado com ${guincho.nome}`);
  }

  const paraTransferir = abertos.find((chamado) => chamado.departamento && DESTINO_DA_TRANSFERENCIA[chamado.departamento.codigo] && !paraGuincho.includes(chamado));
  if (paraTransferir?.departamento) {
    const destino = DESTINO_DA_TRANSFERENCIA[paraTransferir.departamento.codigo] as TipoChamado;
    await transferirChamado(api, paraTransferir.id, { departamento: destino, motivo: "Transferência de exemplo gerada pelo /dev-tools" });
    acoes.push(`${paraTransferir.id}: transferido`);
  }

  const paraOverride = abertos.find((chamado) => chamado.prioridade === "P4");
  if (paraOverride) {
    await definirOverride(api, paraOverride.id, { prioridade: "P2", justificativa: "Override de exemplo gerado pelo /dev-tools" });
    acoes.push(`${paraOverride.id}: override para P2`);
  }
  return acoes;
}
