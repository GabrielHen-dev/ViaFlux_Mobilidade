import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import Provedores from "@/components/providers/Provedores";
import AreaProtegida from "@/components/auth/AreaProtegida";
import { type BackendFalso, type UsuarioDeTeste, criarBackendFalso, tokenDeRenovacao } from "./backendFalso";

export function ligarBackendFalso(backend: BackendFalso = criarBackendFalso()) {
  const fetchFalso = vi.fn(async (endereco: RequestInfo | URL, init: RequestInit = {}) => {
    const cabecalhos: Record<string, string> = {};
    new Headers(init.headers).forEach((valor, chave) => { cabecalhos[chave] = valor; });
    const resposta = backend.responder((init.method ?? "GET").toUpperCase(), String(endereco), typeof init.body === "string" ? init.body : null, cabecalhos);
    return new Response(resposta.status === 204 ? null : resposta.corpo, { status: resposta.status, headers: { "Content-Type": resposta.tipoConteudo } });
  });
  vi.stubGlobal("fetch", fetchFalso);
  return { backend, fetchFalso };
}

export function derrubarRede() {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
}

export async function renderizarComo(usuario: UsuarioDeTeste, interface_: ReactNode) {
  window.localStorage.setItem("viaflux.refreshToken", tokenDeRenovacao(usuario));
  const resultado = render(<Provedores><AreaProtegida>{interface_}</AreaProtegida></Provedores>);
  await screen.findByRole("main", {}, { timeout: 3000 });
  return resultado;
}
