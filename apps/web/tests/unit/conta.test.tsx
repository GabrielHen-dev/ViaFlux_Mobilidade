import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Provedores from "@/components/providers/Provedores";
import AceiteDeConvite from "@/components/auth/AceiteDeConvite";
import CadastroForm from "@/components/auth/CadastroForm";
import RecuperacaoDeSenha from "@/components/auth/RecuperacaoDeSenha";
import RedefinicaoDeSenha from "@/components/auth/RedefinicaoDeSenha";
import VerificacaoDeEmail from "@/components/auth/VerificacaoDeEmail";
import NovoChamado from "@/components/forms/NovoChamado";
import { USUARIOS } from "../support/backendFalso";
import { ligarBackendFalso, renderizarComo } from "../support/renderizar";

interface RespostaProgramada {
  status: number;
  corpo: unknown;
}

function programarApi(respostas: Record<string, RespostaProgramada>) {
  const chamadas: { caminho: string; corpo: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (endereco: RequestInfo | URL, init: RequestInit = {}) => {
    const caminho = new URL(String(endereco)).pathname;
    chamadas.push({ caminho, corpo: typeof init.body === "string" ? JSON.parse(init.body) : null });
    const resposta = respostas[caminho] ?? { status: 404, corpo: { detail: `Sem resposta para ${caminho}` } };
    return new Response(JSON.stringify(resposta.corpo), { status: resposta.status, headers: { "Content-Type": "application/json" } });
  }));
  return chamadas;
}

function emProvedores(componente: React.ReactNode) {
  return render(<Provedores>{componente}</Provedores>);
}

describe("cadastro do cliente", () => {
  it("valida as senhas e o aceite antes de chamar a API", async () => {
    const usuario = userEvent.setup();
    const chamadas = programarApi({});
    emProvedores(<CadastroForm />);

    await usuario.type(screen.getByLabelText("Nome *"), "Ana Cliente");
    await usuario.type(screen.getByLabelText("E-mail *"), "ana@exemplo.com");
    await usuario.type(screen.getByLabelText("Senha *"), "senha-forte-1");
    await usuario.type(screen.getByLabelText("Confirme a senha *"), "outra-senha");
    await usuario.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();
    expect(screen.getByText("É preciso aceitar os termos de uso e a política de privacidade.")).toBeInTheDocument();
    expect(chamadas).toHaveLength(0);
  });

  it("envia o cadastro e pede para confirmar o e-mail", async () => {
    const usuario = userEvent.setup();
    const chamadas = programarApi({ "/auth/cadastro": { status: 202, corpo: { mensagem: "Conta recebida. Enviamos as instruções." } } });
    emProvedores(<CadastroForm />);

    await usuario.type(screen.getByLabelText("Nome *"), " Ana Cliente ");
    await usuario.type(screen.getByLabelText("E-mail *"), "ana@exemplo.com");
    await usuario.type(screen.getByLabelText("Telefone"), "(85) 99999-0000");
    await usuario.type(screen.getByLabelText("Senha *"), "senha-forte-1");
    await usuario.type(screen.getByLabelText("Confirme a senha *"), "senha-forte-1");
    await usuario.click(screen.getByLabelText(/Li e aceito os termos/));
    await usuario.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail" })).toBeInTheDocument();
    expect(screen.getByText("Conta recebida. Enviamos as instruções.")).toBeInTheDocument();
    expect(chamadas.at(-1)).toEqual({
      caminho: "/auth/cadastro",
      corpo: { nome: "Ana Cliente", email: "ana@exemplo.com", senha: "senha-forte-1", telefone: "(85) 99999-0000", aceiteDosTermos: true },
    });
  });

  it("mostra no campo o erro devolvido pela API", async () => {
    const usuario = userEvent.setup();
    programarApi({ "/auth/cadastro": { status: 400, corpo: { detail: "Um ou mais campos são inválidos.", errors: { email: "Informe um e-mail válido." } } } });
    emProvedores(<CadastroForm />);

    await usuario.type(screen.getByLabelText("Nome *"), "Ana");
    await usuario.type(screen.getByLabelText("E-mail *"), "ana@");
    await usuario.type(screen.getByLabelText("Senha *"), "senha-forte-1");
    await usuario.type(screen.getByLabelText("Confirme a senha *"), "senha-forte-1");
    await usuario.click(screen.getByLabelText(/Li e aceito os termos/));
    await usuario.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail *")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("verificação de e-mail", () => {
  it("confirma o e-mail pelo token do link", async () => {
    const chamadas = programarApi({ "/auth/verificacao": { status: 200, corpo: { mensagem: "E-mail confirmado. Você já pode abrir chamados." } } });
    emProvedores(<VerificacaoDeEmail token="token-valido" />);

    expect(await screen.findByText("E-mail confirmado. Você já pode abrir chamados.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(chamadas.filter((chamada) => chamada.caminho === "/auth/verificacao")).toEqual([{ caminho: "/auth/verificacao", corpo: { token: "token-valido" } }]);
  });

  it("com link expirado explica o problema e permite pedir outro", async () => {
    const usuario = userEvent.setup();
    programarApi({
      "/auth/verificacao": { status: 400, corpo: { detail: "Este link é inválido, já foi usado ou expirou. Peça um novo." } },
      "/auth/verificacao/reenvio": { status: 202, corpo: { mensagem: "Se os dados estiverem corretos, enviamos as instruções para o seu e-mail." } },
    });
    emProvedores(<VerificacaoDeEmail token="token-velho" />);

    expect(await screen.findByText("Este link é inválido, já foi usado ou expirou. Peça um novo.")).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("E-mail da conta"), "ana@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Reenviar link de confirmação" }));
    expect(await screen.findByText("Se os dados estiverem corretos, enviamos as instruções para o seu e-mail.")).toBeInTheDocument();
  });
});

describe("recuperação de senha", () => {
  it("responde da mesma forma, exista ou não a conta", async () => {
    const usuario = userEvent.setup();
    const chamadas = programarApi({ "/auth/senha/recuperacao": { status: 202, corpo: { mensagem: "Se os dados estiverem corretos, enviamos as instruções para o seu e-mail." } } });
    emProvedores(<RecuperacaoDeSenha />);

    await usuario.type(screen.getByLabelText("E-mail"), "ninguem@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByText("Se os dados estiverem corretos, enviamos as instruções para o seu e-mail.")).toBeInTheDocument();
    expect(chamadas.at(-1)).toEqual({ caminho: "/auth/senha/recuperacao", corpo: { email: "ninguem@exemplo.com" } });
  });

  it("confere a senha nova antes de enviar e confirma a troca", async () => {
    const usuario = userEvent.setup();
    const chamadas = programarApi({ "/auth/senha/redefinicao": { status: 200, corpo: { mensagem: "Senha alterada. Entre com a senha nova." } } });
    emProvedores(<RedefinicaoDeSenha token="token-de-redefinicao" />);

    await usuario.type(screen.getByLabelText("Senha nova"), "senha-nova-2");
    await usuario.type(screen.getByLabelText("Confirme a senha nova"), "senha-diferente");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha nova" }));
    expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Confirme a senha nova"));
    await usuario.type(screen.getByLabelText("Confirme a senha nova"), "senha-nova-2");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    expect(await screen.findByText("Senha alterada. Entre com a senha nova.")).toBeInTheDocument();
    expect(chamadas.filter((chamada) => chamada.caminho === "/auth/senha/redefinicao"))
      .toEqual([{ caminho: "/auth/senha/redefinicao", corpo: { token: "token-de-redefinicao", senha: "senha-nova-2" } }]);
  });

  it("com link inválido oferece pedir um novo", async () => {
    const usuario = userEvent.setup();
    programarApi({ "/auth/senha/redefinicao": { status: 400, corpo: { detail: "Este link é inválido, já foi usado ou expirou. Peça um novo." } } });
    emProvedores(<RedefinicaoDeSenha token="usado" />);

    await usuario.type(screen.getByLabelText("Senha nova"), "senha-nova-2");
    await usuario.type(screen.getByLabelText("Confirme a senha nova"), "senha-nova-2");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    expect(await screen.findByText("Este link é inválido, já foi usado ou expirou. Peça um novo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar novo link" })).toHaveAttribute("href", "/esqueci-a-senha");
  });
});

describe("aceite de convite", () => {
  const convite = {
    nome: "Paula Atendente",
    email: "paula@viaflux.test",
    perfis: [{ codigo: "ATENDENTE", descricao: "Atendente" }, { codigo: "LIDER_OPERACIONAL", descricao: "Líder operacional" }],
  };

  it("mostra os dados do convidado, confere as senhas e ativa o acesso", async () => {
    const usuario = userEvent.setup();
    const chamadas = programarApi({
      "/auth/convite/consulta": { status: 200, corpo: convite },
      "/auth/convite/aceite": { status: 200, corpo: { mensagem: "Acesso ativado. Entre com seu e-mail e a senha criada." } },
    });
    emProvedores(<AceiteDeConvite token="token-do-convite" />);

    expect(await screen.findByRole("heading", { name: "Ative seu acesso" })).toBeInTheDocument();
    expect(screen.getByText("Paula Atendente")).toBeInTheDocument();
    expect(screen.getByText("paula@viaflux.test")).toBeInTheDocument();
    expect(screen.getByText("Líder operacional")).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Senha"), "senha-da-paula");
    await usuario.type(screen.getByLabelText("Confirme a senha"), "outra-senha");
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso" }));
    expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Confirme a senha"));
    await usuario.type(screen.getByLabelText("Confirme a senha"), "senha-da-paula");
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso" }));

    expect(await screen.findByRole("heading", { name: "Acesso ativado" })).toBeInTheDocument();
    expect(screen.getByText("Acesso ativado. Entre com seu e-mail e a senha criada.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(chamadas.filter((chamada) => chamada.caminho.startsWith("/auth/convite"))).toEqual([
      { caminho: "/auth/convite/consulta", corpo: { token: "token-do-convite" } },
      { caminho: "/auth/convite/aceite", corpo: { token: "token-do-convite", senha: "senha-da-paula" } },
    ]);
  });

  it("com convite expirado ou já usado não mostra o formulário", async () => {
    programarApi({ "/auth/convite/consulta": { status: 400, corpo: { detail: "Este link é inválido, já foi usado ou expirou. Peça um novo." } } });
    emProvedores(<AceiteDeConvite token="usado" />);

    expect(await screen.findByRole("heading", { name: "Convite indisponível" })).toBeInTheDocument();
    expect(screen.getByText("Este link é inválido, já foi usado ou expirou. Peça um novo.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });
});

describe("conta sem e-mail confirmado", () => {
  it("avisa no novo chamado e não deixa enviar", async () => {
    ligarBackendFalso();
    await renderizarComo(USUARIOS.clienteNaoVerificado, <NovoChamado />);

    expect(await screen.findByText("Confirme seu e-mail para abrir chamados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir Chamado" })).toBeDisabled();
  });
});
