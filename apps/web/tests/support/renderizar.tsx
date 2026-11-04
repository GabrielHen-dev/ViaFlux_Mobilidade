import { render, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import Provedores from "@/components/providers/Provedores";
import AreaProtegida from "@/components/auth/AreaProtegida";
import { type BackendFalso, type UsuarioDeTeste, criarBackendFalso, tokenDeRenovacao } from "./backendFalso";

function comoCorpoDoBackend(corpo: RequestInit["body"]) {
  if (typeof corpo === "string") return corpo;
  if (!(corpo instanceof FormData)) return null;
  const partes = [...corpo.entries()].map(([nome, valor]) => (valor instanceof File
    ? `--limite\r\nContent-Disposition: form-data; name="${nome}"; filename="${valor.name}"\r\n\r\nconteudo\r\n`
    : `--limite\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`));
  return `${partes.join("")}--limite--`;
}

export function ligarBackendFalso(backend: BackendFalso = criarBackendFalso()) {
  const fetchFalso = vi.fn(async (endereco: RequestInfo | URL, init: RequestInit = {}) => {
    const cabecalhos: Record<string, string> = {};
    new Headers(init.headers).forEach((valor, chave) => { cabecalhos[chave] = valor; });
    const resposta = backend.responder((init.method ?? "GET").toUpperCase(), String(endereco), comoCorpoDoBackend(init.body), cabecalhos);
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

export async function escolher(usuario: UserEvent, rotuloDoCampo: string | RegExp, textoDaOpcao: string | RegExp) {
  await usuario.click(await screen.findByLabelText(rotuloDoCampo));
  await usuario.click(await screen.findByRole("option", { name: textoDaOpcao }));
}
