import type { UsuarioAutenticado } from "@/types/auth";

export const PERFIS_DE_CLIENTE = ["CLIENTE", "GESTOR_FROTA"] as const;
export const PERFIS_DA_CENTRAL = ["ADMIN", "ATENDENTE", "DEPARTAMENTO", "LIDER_OPERACIONAL"] as const;
export const PERFIS_COM_VISAO_GLOBAL = ["ADMIN", "ATENDENTE", "LIDER_OPERACIONAL"] as const;
export const PERFIS_DE_TRIAGEM = ["ADMIN", "ATENDENTE"] as const;
export const PERFIS_DA_LIXEIRA = ["ADMIN", "ATENDENTE"] as const;
export const PERFIS_QUE_CONDUZEM = ["ADMIN", "ATENDENTE", "DEPARTAMENTO"] as const;
export const PERFIS_QUE_ATENDEM = ["ADMIN", "ATENDENTE", "DEPARTAMENTO"] as const;
export const PERFIS_DE_METRICAS = ["ADMIN", "LIDER_OPERACIONAL"] as const;
export const PERFIS_DE_FORNECEDOR = ["FORNECEDOR"] as const;
export const PERFIS_QUE_ABREM_PELA_CENTRAL = ["ADMIN", "ATENDENTE"] as const;
export const PERFIS_QUE_ABREM_CHAMADO = [...PERFIS_DE_CLIENTE, ...PERFIS_QUE_ABREM_PELA_CENTRAL] as const;

export function temAlgumPerfil(perfis: readonly string[], esperados: readonly string[]) {
  return perfis.some((perfil) => esperados.includes(perfil));
}

export function codigosDePerfil(usuario: UsuarioAutenticado) {
  return usuario.perfis.map((perfil) => perfil.codigo);
}

export function usuarioTemPerfil(usuario: UsuarioAutenticado, esperados: readonly string[]) {
  return temAlgumPerfil(codigosDePerfil(usuario), esperados);
}

export function rotaInicialDo(usuario: UsuarioAutenticado) {
  if (usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL)) return "/";
  if (usuarioTemPerfil(usuario, PERFIS_DE_FORNECEDOR)) return "/fornecedor";
  if (usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE)) return "/portal";
  return "/";
}
