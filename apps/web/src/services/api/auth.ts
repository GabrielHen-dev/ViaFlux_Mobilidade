import { requisitarApi } from "@/services/api/cliente";
import type { Sessao } from "@/types/auth";

export function entrar(email: string, senha: string) {
  return requisitarApi<Sessao>("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
}

export function renovarSessao(refreshToken: string) {
  return requisitarApi<Sessao>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) });
}
