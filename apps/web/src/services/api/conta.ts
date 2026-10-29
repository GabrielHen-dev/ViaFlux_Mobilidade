import { requisitarApi } from "@/services/api/cliente";

export interface RespostaDaConta {
  mensagem: string;
}

export interface DadosDoCadastro {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  aceiteDosTermos: boolean;
}

export interface PerfilDoConvite {
  codigo: string;
  descricao: string;
}

export interface Convite {
  nome: string;
  email: string;
  perfis: PerfilDoConvite[];
}

function enviar(caminho: string, corpo: unknown) {
  return requisitarApi<RespostaDaConta>(caminho, { method: "POST", body: JSON.stringify(corpo) });
}

export function cadastrarConta(dados: DadosDoCadastro) {
  return enviar("/auth/cadastro", dados);
}

export function confirmarEmail(token: string) {
  return enviar("/auth/verificacao", { token });
}

export function reenviarVerificacao(email: string) {
  return enviar("/auth/verificacao/reenvio", { email });
}

export function solicitarRedefinicaoDeSenha(email: string) {
  return enviar("/auth/senha/recuperacao", { email });
}

export function redefinirSenha(token: string, senha: string) {
  return enviar("/auth/senha/redefinicao", { token, senha });
}

export function consultarConvite(token: string) {
  return requisitarApi<Convite>("/auth/convite/consulta", { method: "POST", body: JSON.stringify({ token }) });
}

export function aceitarConvite(token: string, senha: string) {
  return enviar("/auth/convite/aceite", { token, senha });
}
