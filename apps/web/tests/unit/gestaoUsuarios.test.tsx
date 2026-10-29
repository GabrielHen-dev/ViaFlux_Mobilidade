import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GestaoUsuarios from "@/components/admin/GestaoUsuarios";
import type { UsuarioAdmin } from "@/services/api/admin-usuarios";
import { USUARIOS, criarBackendFalso } from "../support/backendFalso";
import { renderizarComo } from "../support/renderizar";

interface ChamadaAdmin {
  metodo: string;
  caminho: string;
  corpo: unknown;
}

const OPCOES = {
  perfis: [{ codigo: "ATENDENTE", descricao: "Atendente" }, { codigo: "CLIENTE", descricao: "Cliente" }],
  departamentos: [],
  organizacoes: [
    { id: "org-transportes", nome: "Transportes Rápidos", tipo: "CLIENTE" },
    { id: "org-guincho", nome: "Guincho Teste", tipo: "FORNECEDOR" },
  ],
};

const PAULA: UsuarioAdmin = {
  id: "u-paula", nome: "Paula Atendente", email: "paula@viaflux.test", ativo: true, convitePendente: true,
  perfis: [{ codigo: "ATENDENTE", descricao: "Atendente" }], organizacao: null, departamentos: [],
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

function ligarAdministracaoFalsa() {
  const backend = criarBackendFalso();
  const usuarios: UsuarioAdmin[] = [PAULA];
  const chamadas: ChamadaAdmin[] = [];

  function administrar(metodo: string, caminho: string, corpo: Record<string, unknown> | null) {
    chamadas.push({ metodo, caminho, corpo });
    if (metodo === "GET" && caminho === "/api/admin/usuarios/opcoes") return resposta(OPCOES);
    if (metodo === "GET" && caminho === "/api/admin/usuarios") {
      return resposta({ content: usuarios, page: 0, size: 20, totalElements: usuarios.length, totalPages: 1 });
    }
    if (metodo === "POST" && caminho === "/api/admin/usuarios" && corpo) {
      if (corpo.email === "paula@viaflux.test") return resposta({ detail: "Já existe um usuário com este e-mail." }, 409);
      const organizacao = OPCOES.organizacoes.find((org) => org.id === corpo.organizacaoId) ?? null;
      const criado: UsuarioAdmin = {
        id: "u-novo", nome: String(corpo.nome), email: String(corpo.email), ativo: true, convitePendente: true,
        perfis: OPCOES.perfis.filter((perfil) => (corpo.perfis as string[]).includes(perfil.codigo)),
        organizacao: organizacao as UsuarioAdmin["organizacao"], departamentos: [],
      };
      usuarios.push(criado);
      return resposta(criado, 201);
    }
    if (metodo === "POST" && caminho === `/api/admin/usuarios/${PAULA.id}/convite`) return resposta(PAULA, 202);
    return resposta({ detail: `Sem resposta para ${metodo} ${caminho}` }, 404);
  }

  vi.stubGlobal("fetch", vi.fn(async (endereco: RequestInfo | URL, init: RequestInit = {}) => {
    const metodo = (init.method ?? "GET").toUpperCase();
    const url = new URL(String(endereco));
    const corpo = typeof init.body === "string" ? init.body : null;
    if (url.pathname.startsWith("/api/admin/")) return administrar(metodo, url.pathname, corpo ? JSON.parse(corpo) : null);
    const cabecalhos: Record<string, string> = {};
    new Headers(init.headers).forEach((valor, chave) => { cabecalhos[chave] = valor; });
    const falsa = backend.responder(metodo, String(endereco), corpo, cabecalhos);
    return new Response(falsa.status === 204 ? null : falsa.corpo, { status: falsa.status, headers: { "Content-Type": falsa.tipoConteudo } });
  }));
  return chamadas;
}

describe("gestão de usuários", () => {
  it("convida um usuário sem senha, escolhendo a organização no seletor", async () => {
    const usuario = userEvent.setup();
    const chamadas = ligarAdministracaoFalsa();
    await renderizarComo(USUARIOS.admin, <GestaoUsuarios />);

    expect(await screen.findByText("Paula Atendente")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Convidar usuário" }));
    const dialogo = screen.getByRole("dialog", { name: "Convidar usuário" });
    expect(within(dialogo).queryByLabelText(/senha/i)).not.toBeInTheDocument();

    await usuario.type(within(dialogo).getByLabelText("Nome"), "Rui Cliente");
    await usuario.type(within(dialogo).getByLabelText("E-mail"), "rui@transportes.test");
    await usuario.click(within(dialogo).getByRole("checkbox", { name: /^Cliente/ }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Enviar convite" }));
    expect(within(dialogo).getByText("Selecione a organização.")).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole("combobox", { name: "Organização" }));
    expect(screen.queryByRole("option", { name: /Guincho Teste/ })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("option", { name: /Transportes Rápidos/ }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Enviar convite" }));

    expect(await screen.findByText("Convite enviado")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Convidar usuário" })).not.toBeInTheDocument();
    expect(chamadas.filter((chamada) => chamada.metodo === "POST")).toEqual([{
      metodo: "POST",
      caminho: "/api/admin/usuarios",
      corpo: { nome: "Rui Cliente", email: "rui@transportes.test", perfis: ["CLIENTE"], organizacaoId: "org-transportes", departamentos: [] },
    }]);
    expect(await screen.findByText("Rui Cliente")).toBeInTheDocument();
  });

  it("mostra no campo o e-mail já cadastrado", async () => {
    const usuario = userEvent.setup();
    ligarAdministracaoFalsa();
    await renderizarComo(USUARIOS.admin, <GestaoUsuarios />);

    await screen.findByText("Paula Atendente");
    await usuario.click(screen.getByRole("button", { name: "Convidar usuário" }));
    const dialogo = screen.getByRole("dialog", { name: "Convidar usuário" });
    await usuario.type(within(dialogo).getByLabelText("Nome"), "Paula");
    await usuario.type(within(dialogo).getByLabelText("E-mail"), "paula@viaflux.test");
    await usuario.click(within(dialogo).getByRole("checkbox", { name: /^Atendente/ }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Enviar convite" }));

    expect(await within(dialogo).findByText("Já existe um usuário com este e-mail.")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("sinaliza o convite pendente e permite reenviá-lo", async () => {
    const usuario = userEvent.setup();
    const chamadas = ligarAdministracaoFalsa();
    await renderizarComo(USUARIOS.admin, <GestaoUsuarios />);

    const linha = (await screen.findByText("Paula Atendente")).closest("tr") as HTMLElement;
    expect(within(linha).getByText("Convite pendente")).toBeInTheDocument();
    await usuario.click(within(linha).getByRole("button", { name: "Reenviar convite para Paula Atendente" }));

    expect(await screen.findByText("Convite enviado")).toBeInTheDocument();
    expect(chamadas.filter((chamada) => chamada.metodo === "POST").map((chamada) => chamada.caminho))
      .toEqual([`/api/admin/usuarios/${PAULA.id}/convite`]);
  });
});
