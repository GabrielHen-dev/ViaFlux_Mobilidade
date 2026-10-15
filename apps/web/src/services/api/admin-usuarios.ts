import { requisitarApi } from "@/services/api/cliente";

export interface PerfilAdmin {
  codigo: string;
  descricao: string;
}

export interface DepartamentoAdmin {
  codigo: string;
  nome: string;
}

export interface OrganizacaoAdmin {
  id: string;
  nome: string;
  tipo: "CLIENTE" | "FORNECEDOR";
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfis: PerfilAdmin[];
  organizacao: OrganizacaoAdmin | null;
  departamentos: DepartamentoAdmin[];
}

export interface OpcoesAdmin {
  perfis: PerfilAdmin[];
  departamentos: DepartamentoAdmin[];
  organizacoes: OrganizacaoAdmin[];
}

export interface PaginaUsuariosAdmin {
  content: UsuarioAdmin[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DadosUsuarioAdmin {
  nome: string;
  email: string;
  senha?: string;
  perfis: string[];
  organizacaoId: string | null;
  departamentos: string[];
}

function comToken(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function buscarOpcoesAdmin(accessToken: string) {
  return requisitarApi<OpcoesAdmin>("/api/admin/usuarios/opcoes", {
    headers: comToken(accessToken),
  });
}

export function listarUsuariosAdmin(accessToken: string, page: number, size = 20) {
  return requisitarApi<PaginaUsuariosAdmin>(`/api/admin/usuarios?page=${page}&size=${size}`, {
    headers: comToken(accessToken),
  });
}

export function criarUsuarioAdmin(accessToken: string, dados: DadosUsuarioAdmin) {
  return requisitarApi<UsuarioAdmin>("/api/admin/usuarios", {
    method: "POST",
    headers: comToken(accessToken),
    body: JSON.stringify(dados),
  });
}

export function atualizarUsuarioAdmin(accessToken: string, id: string, dados: DadosUsuarioAdmin) {
  return requisitarApi<UsuarioAdmin>(`/api/admin/usuarios/${id}`, {
    method: "PUT",
    headers: comToken(accessToken),
    body: JSON.stringify(dados),
  });
}

export function alterarUsuarioAtivo(accessToken: string, id: string, ativo: boolean) {
  return requisitarApi<UsuarioAdmin>(`/api/admin/usuarios/${id}/ativo`, {
    method: "PATCH",
    headers: comToken(accessToken),
    body: JSON.stringify({ ativo }),
  });
}

export function criarOrganizacaoAdmin(
  accessToken: string,
  dados: Pick<OrganizacaoAdmin, "nome" | "tipo">,
) {
  return requisitarApi<OrganizacaoAdmin>("/api/admin/organizacoes", {
    method: "POST",
    headers: comToken(accessToken),
    body: JSON.stringify(dados),
  });
}
