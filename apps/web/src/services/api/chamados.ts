import type {
  Anexo, Chamado, ChamadoResumo, Contexto, Departamento, Localizacao, Motivo, PaginaChamados, ResumoChamados, TipoChamado,
} from "@/types/chamado";
import type {
  DadosAberturaChamado, DadosAtualizacao, DadosConclusaoTriagem, DadosOverride, DadosReclassificacao, DadosStatus, DadosTransferencia, FiltrosChamados,
} from "@/services/api/contratos";

export interface ClienteApi {
  requisitar<T>(caminho: string, init?: RequestInit): Promise<T>;
  baixar(caminho: string, init?: RequestInit): Promise<Blob>;
}

function caminhoDo(codigo: string, sufixo = "") {
  return `/api/chamados/${encodeURIComponent(codigo)}${sufixo}`;
}

function json(metodo: string, corpo?: unknown, headers?: HeadersInit): RequestInit {
  return { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) };
}

export function paraConsulta(filtros: object) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") parametros.set(chave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export function listarChamados(api: ClienteApi, filtros: FiltrosChamados) {
  return api.requisitar<PaginaChamados>(`/api/chamados${paraConsulta(filtros)}`);
}

export function resumirChamados(api: ClienteApi, filtros: Omit<FiltrosChamados, "page" | "size" | "ordenacao">) {
  return api.requisitar<ResumoChamados>(`/api/chamados/resumo${paraConsulta(filtros)}`);
}

export function consultarChamado(api: ClienteApi, codigo: string) {
  return api.requisitar<Chamado>(caminhoDo(codigo));
}

export function abrirChamado(api: ClienteApi, dados: DadosAberturaChamado, chaveIdempotencia: string) {
  return api.requisitar<Chamado>("/api/chamados", json("POST", dados, { "Idempotency-Key": chaveIdempotencia }));
}

export function listarMotivos(api: ClienteApi) {
  return api.requisitar<Motivo[]>("/api/classificacao/motivos");
}

export function listarContextos(api: ClienteApi, tipo: TipoChamado) {
  return api.requisitar<Contexto[]>(`/api/classificacao/contextos${paraConsulta({ tipo })}`);
}

export function listarDepartamentos(api: ClienteApi) {
  return api.requisitar<Departamento[]>("/api/departamentos");
}

export function alterarStatus(api: ClienteApi, codigo: string, dados: DadosStatus) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/status"), json("PATCH", dados));
}

export function assumirAtendimento(api: ClienteApi, codigo: string) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/atendimento"), json("POST"));
}

export function transferirChamado(api: ClienteApi, codigo: string, dados: DadosTransferencia) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/transferencias"), json("POST", dados));
}

export function iniciarTriagem(api: ClienteApi, codigo: string) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/triagem/inicio"), json("POST"));
}

export function concluirTriagem(api: ClienteApi, codigo: string, dados: DadosConclusaoTriagem) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/triagem"), json("POST", dados));
}

export function reclassificarChamado(api: ClienteApi, codigo: string, dados: DadosReclassificacao) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/classificacao"), json("PUT", dados));
}

export function definirOverride(api: ClienteApi, codigo: string, dados: DadosOverride) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/override"), json("PUT", dados));
}

export function removerOverride(api: ClienteApi, codigo: string) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/override"), json("DELETE"));
}

export function registrarAtualizacao(api: ClienteApi, codigo: string, dados: DadosAtualizacao) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/atualizacoes"), json("POST", dados));
}

export function registrarLocalizacao(api: ClienteApi, codigo: string, localizacao: Localizacao) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/localizacao"), json("PUT", localizacao));
}

export function enviarAnexo(api: ClienteApi, codigo: string, arquivo: File, chaveIdempotencia: string) {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  return api.requisitar<Anexo>(caminhoDo(codigo, "/anexos"), { method: "POST", body: formulario, headers: { "Idempotency-Key": chaveIdempotencia } });
}

export function baixarAnexo(api: ClienteApi, codigo: string, anexoId: string) {
  return api.baixar(caminhoDo(codigo, `/anexos/${encodeURIComponent(anexoId)}/conteudo`));
}

export function moverParaLixeira(api: ClienteApi, codigo: string) {
  return api.requisitar<void>(caminhoDo(codigo), json("DELETE"));
}

export function listarLixeira(api: ClienteApi) {
  return api.requisitar<ChamadoResumo[]>("/api/chamados/lixeira");
}

export function restaurarDaLixeira(api: ClienteApi, codigo: string) {
  return api.requisitar<Chamado>(caminhoDo(codigo, "/restauracao"), json("POST"));
}

export function excluirDefinitivamente(api: ClienteApi, codigo: string) {
  return api.requisitar<void>(`/api/chamados/lixeira/${encodeURIComponent(codigo)}`, json("DELETE"));
}

export function esvaziarLixeira(api: ClienteApi) {
  return api.requisitar<void>("/api/chamados/lixeira", json("DELETE"));
}
