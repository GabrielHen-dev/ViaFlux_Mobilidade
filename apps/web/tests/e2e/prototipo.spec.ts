import { test, expect, type Page } from "@playwright/test";
import { type BackendFalso, SENHA_DE_TESTE, USUARIOS, type UsuarioDeTeste, criarBackendFalso } from "../support/backendFalso";

const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

interface Rede {
  online: boolean;
}

async function conectar(page: Page, backend: BackendFalso, rede: Rede = { online: true }) {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  await page.route("http://localhost:8281/**", async (rota) => {
    const requisicao = rota.request();
    if (requisicao.method() === "OPTIONS") return rota.fulfill({ status: 204, headers: CABECALHOS_CORS });
    if (!rede.online) return rota.abort("internetdisconnected");
    const resposta = backend.responder(requisicao.method(), requisicao.url(), requisicao.postData(), await requisicao.allHeaders());
    return rota.fulfill({ status: resposta.status, contentType: resposta.tipoConteudo, body: resposta.corpo, headers: CABECALHOS_CORS });
  });
  return erros;
}

async function entrarComo(page: Page, usuario: UsuarioDeTeste) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(usuario.email);
  await page.getByLabel("Senha").fill(SENHA_DE_TESTE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
}

async function escolher(page: Page, rotuloDoCampo: string, textoDaOpcao: string | RegExp) {
  await page.getByLabel(rotuloDoCampo, { exact: true }).click();
  await page.getByRole("option", { name: textoDaOpcao }).click();
}

async function sair(page: Page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function abrirChamadoDePane(page: Page) {
  await page.getByRole("navigation").getByRole("link", { name: "Novo Chamado" }).click();
  await escolher(page, "Motivo *", "Veículo não liga / Pane elétrica ou mecânica");
  await escolher(page, "Contexto situacional *", "Veículo parado em rodovia, via rápida ou local de risco");
  await page.getByLabel("Descrição *").fill("Caminhão parou no acostamento e não liga mais.");
  await page.getByLabel("Modelo").fill("Volvo FH 460");
}

async function semRolagemHorizontal(page: Page, contexto: string) {
  const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(larguras.documento, contexto).toBeLessThanOrEqual(larguras.janela);
}

test("ciclo completo: cliente abre, atendente tria, central atende, fornecedor atualiza e cliente acompanha", async ({ page, context }) => {
  const backend = criarBackendFalso();
  const erros = await conectar(page, backend);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.4356, longitude: -46.4731 });

  await entrarComo(page, USUARIOS.cliente);
  await expect(page).toHaveURL(/\/portal$/);
  await abrirChamadoDePane(page);
  await page.getByRole("button", { name: "Usar minha localização" }).click();
  await expect(page.getByLabel("Rua, avenida ou rodovia")).toHaveValue("Rodovia Presidente Dutra");
  await expect(page.getByText("Localização obtida com sucesso.")).toBeVisible();
  await expect(page.getByText(/GPS registrado|Localização encontrada/)).toHaveCount(0);
  await page.getByLabel("Selecionar anexos").setInputFiles({ name: "painel.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await page.getByRole("button", { name: "Abrir Chamado" }).click();
  await expect(page.getByRole("heading", { name: "Chamado aberto" })).toBeVisible();
  await expect(page.getByTestId("protocolo")).toHaveText("VF-0000");
  await expect(page.getByText("Aguardando classificação")).toBeVisible();
  await expect(page.getByTestId("previsao-da-triagem")).toBeVisible();
  await expect(page.getByText("Enviado")).toBeVisible();
  await sair(page);

  await entrarComo(page, USUARIOS.departamento);
  await expect(page.getByText("Nenhum chamado encontrado com os filtros aplicados.")).toBeVisible();
  await sair(page);

  await entrarComo(page, USUARIOS.admin);
  await expect(page.getByRole("region", { name: "Fila de triagem" })).toBeVisible();
  await page.getByRole("navigation", { name: "Menu principal" }).getByRole("link", { name: "Triagem" }).click();
  await expect(page.getByRole("heading", { name: "Fila de triagem" })).toBeVisible();
  await page.getByRole("button", { name: "Assumir triagem do chamado VF-0000" }).click();
  await expect(page.getByRole("heading", { name: "Triagem — #VF-0000" })).toBeVisible();
  await expect(page.getByText("Em triagem com você")).toBeVisible();
  await page.getByRole("button", { name: "Concluir triagem e encaminhar" }).click();
  await expect(page.getByText("Triagem concluída: P1 · encaminhado para Assistência 24h.")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao chamado" }).click();
  await expect(page.getByRole("heading", { name: "#VF-0000" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Baixar painel.png" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abrir no mapa/ })).toHaveAttribute("href", /-23\.4356/);
  await page.getByRole("button", { name: "Assumir chamado" }).click();
  await expect(page.getByText("Status alterado para Em atendimento")).toBeVisible();
  await page.getByLabel("Adicionar atualização ao histórico").fill("Anotação interna: cliente com contrato corporativo");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.getByText("Anotação interna: cliente com contrato corporativo")).toBeVisible();

  await page.getByRole("button", { name: "Incluir serviço terceirizado" }).click();
  await escolher(page, "Fornecedor credenciado *", /Guincho Teste/);
  await page.getByRole("button", { name: "Remoção do veículo", exact: true }).click();
  await page.getByRole("button", { name: "Acionar fornecedor" }).click();
  await expect(page.getByText("Serviço: Solicitado")).toBeVisible();

  await page.getByRole("link", { name: "Transferir / status" }).click();
  await escolher(page, "Departamento de destino *", "Manutenção");
  await page.getByLabel("Motivo da transferência *").fill("Precisa de oficina depois da remoção");
  await page.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(page.getByText("Chamado transferido para Manutenção.")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao chamado" }).click();
  await page.getByRole("main").getByRole("link", { name: "Triagem", exact: true }).click();
  await page.getByText("Média (3)").first().click();
  await page.getByLabel("Justificativa *").first().fill("Veículo já está em local seguro, sem risco");
  await page.getByRole("button", { name: "Confirmar reclassificação" }).click();
  await expect(page.getByText(/Chamado reclassificado: score 8 · P2/)).toBeVisible();
  await sair(page);

  await entrarComo(page, USUARIOS.fornecedor);
  await expect(page).toHaveURL(/\/fornecedor$/);
  await expect(page.getByRole("heading", { name: "Remoção do veículo · VF-0000" })).toBeVisible();
  await expect(page.getByText("Carla Cliente")).toHaveCount(0);
  await page.getByText("Em execução", { exact: true }).click();
  await page.getByLabel("Observação").fill("Guincho saiu do pátio");
  await page.getByRole("button", { name: "Registrar atualização" }).click();
  await expect(page.getByText("Serviço: Em execução")).toBeVisible();
  await sair(page);

  await entrarComo(page, USUARIOS.cliente);
  await expect(page.getByRole("button", { name: /Notificações: \d+ não lidas/ })).toBeVisible();
  await page.getByRole("link", { name: /VF-0000/ }).first().click();
  await expect(page.getByRole("heading", { name: "Chamado VF-0000" })).toBeVisible();
  await expect(page.getByText("Status alterado para Em atendimento")).toBeVisible();
  await expect(page.getByText(/Anotação interna/)).toHaveCount(0);
  await expect(page.getByText(/Chamado transferido/)).toHaveCount(0);
  await expect(page.getByText("Triagem concluída")).toHaveCount(0);
  expect(backend.contagem.aberturas).toBe(1);
  expect(erros).toEqual([]);
});

test("perfis só enxergam as próprias telas e menus", async ({ page }) => {
  const backend = criarBackendFalso();
  await conectar(page, backend);

  await entrarComo(page, USUARIOS.cliente);
  const menuDoCliente = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menuDoCliente.getByRole("link")).toHaveText(["Meus chamados", "Novo Chamado"]);
  await page.goto("/metricas");
  await expect(page.getByRole("heading", { name: "Acesso não permitido" })).toBeVisible();
  await sair(page);

  await entrarComo(page, USUARIOS.lider);
  await expect(page.getByRole("navigation", { name: "Menu principal" }).getByRole("link")).toHaveText(["Dashboard", "Métricas"]);
  await page.getByRole("link", { name: "Métricas" }).click();
  await expect(page.getByText("CSAT")).toBeVisible();
  await expect(page.getByText("Pendente de levantamento").first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^metricas-viaflux-.*\.csv$/);
  await page.goto("/chamados/novo");
  await expect(page.getByRole("heading", { name: "Acesso não permitido" })).toBeVisible();
});

test("celular em 360px: rede caiu no envio, rascunho preservado e reenvio sem duplicar", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const backend = criarBackendFalso();
  const rede: Rede = { online: true };
  await conectar(page, backend, rede);
  await entrarComo(page, USUARIOS.cliente);
  await semRolagemHorizontal(page, "portal");
  await abrirChamadoDePane(page);
  await semRolagemHorizontal(page, "novo chamado");
  await expect(page.getByRole("button", { name: "Tirar foto com a câmera" })).toBeVisible();

  const abertura = page.getByRole("button", { name: "Abrir Chamado" });
  const altura = (await abertura.boundingBox())?.height ?? 0;
  expect(altura).toBeGreaterThanOrEqual(44);

  rede.online = false;
  await abertura.click();
  await expect(page.getByText("Envio não confirmado: a abertura não foi registrada.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chamado aberto" })).toHaveCount(0);

  rede.online = true;
  await page.reload();
  await expect(page.getByText(/Rascunho restaurado/)).toBeVisible();
  await expect(page.getByLabel("Descrição *")).toHaveValue("Caminhão parou no acostamento e não liga mais.");

  await page.getByRole("button", { name: "Abrir Chamado" }).click();
  await expect(page.getByRole("heading", { name: "Chamado aberto" })).toBeVisible();
  expect(backend.contagem.aberturas).toBe(1);

  await page.getByRole("link", { name: "Acompanhar chamado" }).click();
  await expect(page.getByRole("heading", { name: "Chamado VF-0000" })).toBeVisible();
  await semRolagemHorizontal(page, "detalhe do cliente");
});

test("rotas diretas, recarregamento e protocolo inexistente", async ({ page }) => {
  const backend = criarBackendFalso();
  await conectar(page, backend);
  await entrarComo(page, USUARIOS.cliente);
  await abrirChamadoDePane(page);
  await page.getByRole("button", { name: "Abrir Chamado" }).click();
  await expect(page.getByTestId("protocolo")).toHaveText("VF-0000");
  await sair(page);

  await entrarComo(page, USUARIOS.atendente);
  for (const [url, titulo] of [
    ["/chamados/VF-0000", "#VF-0000"],
    ["/chamados/VF-0000/triagem", "Triagem — #VF-0000"],
    ["/chamados/VF-0000/encaminhamento", "Transferência — #VF-0000"],
    ["/lixeira", "Lixeira"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lixeira", exact: true })).toBeVisible();
  await page.goto("/chamados/VF-9999");
  await expect(page.getByRole("heading", { name: "Chamado não encontrado" })).toBeVisible();
});
