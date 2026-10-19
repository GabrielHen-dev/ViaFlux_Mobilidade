import type { Transporte } from "@/services/api/transporte";
import type { Autor } from "@/types/chamado";
import { RespostaAntecipada } from "@/services/api/simulacao/resposta";
import { PERFIS_DE_CLIENTE, PERFIS_DE_FORNECEDOR, temAlgumPerfil } from "@/utils/perfis";
import { rotasDeChamados } from "@/services/api/simulacao/rotas/chamados";
import { rotasDeClassificacao } from "@/services/api/simulacao/rotas/classificacao";
import { rotasDeFornecedores } from "@/services/api/simulacao/rotas/fornecedores";
import { rotasDeNotificacoes } from "@/services/api/simulacao/rotas/notificacoes";
import { rotasDeMetricas } from "@/services/api/simulacao/rotas/metricas";

export interface UsuarioDoToken {
  id: string;
  perfis: string[];
}

export interface ContextoSimulado {
  metodo: string;
  url: URL;
  parametros: Record<string, string>;
  consulta: URLSearchParams;
  headers: Headers;
  init: RequestInit;
  usuario: UsuarioDoToken | null;
  agora: Date;
  visaoDeCliente: boolean;
  visaoDeFornecedor: boolean;
  corpo<T>(): T;
  formulario(): FormData | null;
  real(caminho: string, init?: RequestInit): Promise<Response>;
  realJson<T>(caminho: string, init?: RequestInit): Promise<T>;
  autor(): Promise<Autor>;
}

export interface RotaSimulada {
  metodo: string;
  padrao: string;
  tratar(contexto: ContextoSimulado): Promise<Response>;
}

const ROTAS: RotaSimulada[] = [
  ...rotasDeClassificacao,
  ...rotasDeFornecedores,
  ...rotasDeNotificacoes,
  ...rotasDeMetricas,
  ...rotasDeChamados,
];

const autoresEmCache = new Map<string, Autor>();

function decodificarBase64Url(texto: string) {
  const base64 = texto.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(texto.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function lerUsuarioDoToken(headers: Headers): UsuarioDoToken | null {
  const autorizacao = headers.get("Authorization");
  if (!autorizacao?.startsWith("Bearer ")) return null;
  try {
    const carga = JSON.parse(decodificarBase64Url(autorizacao.slice(7).split(".")[1] ?? "")) as { sub?: string; perfis?: string[] };
    return carga.sub ? { id: carga.sub, perfis: carga.perfis ?? [] } : null;
  } catch {
    return null;
  }
}

function casarPadrao(padrao: string, caminho: string) {
  const partesDoPadrao = padrao.split("/");
  const partesDoCaminho = caminho.split("/");
  if (partesDoPadrao.length !== partesDoCaminho.length) return null;
  const parametros: Record<string, string> = {};
  for (let indice = 0; indice < partesDoPadrao.length; indice += 1) {
    const esperado = partesDoPadrao[indice];
    const recebido = decodeURIComponent(partesDoCaminho[indice]);
    if (esperado.startsWith(":")) parametros[esperado.slice(1)] = recebido;
    else if (esperado !== recebido) return null;
  }
  return parametros;
}

function encontrarRota(metodo: string, caminho: string) {
  for (const rota of ROTAS) {
    if (rota.metodo !== metodo) continue;
    const parametros = casarPadrao(rota.padrao, caminho);
    if (parametros) return { rota, parametros };
  }
  return null;
}

function criarContexto(viaRede: Transporte, url: URL, init: RequestInit, metodo: string, parametros: Record<string, string>): ContextoSimulado {
  const headers = new Headers(init.headers);
  const usuario = lerUsuarioDoToken(headers);
  const perfis = usuario?.perfis ?? [];
  const real = (caminho: string, initReal: RequestInit = {}) => {
    const headersReais = new Headers(initReal.headers);
    const autorizacao = headers.get("Authorization");
    if (autorizacao) headersReais.set("Authorization", autorizacao);
    if (typeof initReal.body === "string") headersReais.set("Content-Type", "application/json");
    return viaRede(`${url.origin}${caminho}`, { ...initReal, headers: headersReais });
  };
  const realJson = async <T,>(caminho: string, initReal?: RequestInit) => {
    const resposta = await real(caminho, initReal);
    if (!resposta.ok) throw new RespostaAntecipada(resposta);
    return (await resposta.json()) as T;
  };
  return {
    metodo,
    url,
    parametros,
    consulta: url.searchParams,
    headers,
    init,
    usuario,
    agora: new Date(),
    visaoDeCliente: temAlgumPerfil(perfis, PERFIS_DE_CLIENTE) && !temAlgumPerfil(perfis, ["ADMIN", "ATENDENTE", "DEPARTAMENTO", "LIDER_OPERACIONAL"]),
    visaoDeFornecedor: temAlgumPerfil(perfis, PERFIS_DE_FORNECEDOR),
    corpo: <T,>() => (typeof init.body === "string" ? JSON.parse(init.body) : {}) as T,
    formulario: () => (init.body instanceof FormData ? init.body : null),
    real,
    realJson,
    async autor() {
      if (!usuario) return { id: null, nome: "Usuário não identificado" };
      const emCache = autoresEmCache.get(usuario.id);
      if (emCache) return emCache;
      const resposta = await real("/auth/me").catch(() => null);
      const dados = resposta?.ok ? ((await resposta.json()) as { id: string; nome: string }) : null;
      const autor = { id: usuario.id, nome: dados?.nome ?? "Usuário" };
      autoresEmCache.set(usuario.id, autor);
      return autor;
    },
  };
}

export function simularEndpointsPendentes(viaRede: Transporte): Transporte {
  return async (endereco, init) => {
    const url = new URL(endereco);
    const metodo = (init.method ?? "GET").toUpperCase();
    const encontrada = encontrarRota(metodo, url.pathname);
    if (!encontrada) return viaRede(endereco, init);
    try {
      return await encontrada.rota.tratar(criarContexto(viaRede, url, init, metodo, encontrada.parametros));
    } catch (erro) {
      if (erro instanceof RespostaAntecipada) return erro.resposta;
      throw erro;
    }
  };
}

export function limparCacheDeAutores() {
  autoresEmCache.clear();
}
