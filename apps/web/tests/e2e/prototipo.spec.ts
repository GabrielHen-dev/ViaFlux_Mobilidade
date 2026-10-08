import { test, expect } from "@playwright/test";

test("criação, triagem, encaminhamento, parceiro, timeline e restauração", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Novo Chamado" }).click();
  await expect(page).toHaveURL(/\/chamados\/novo$/);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Novo Chamado" })).toHaveAttribute("aria-current", "page");
  await page.getByLabel("Nome *").fill("Cliente E2E");
  await page.getByLabel("Modelo *").fill("Volvo FH 460");
  await page.getByLabel("Placa", { exact: true }).fill("test-1234");
  await page.getByLabel("Tipo do problema *").selectOption("Mecânico");
  await page.getByLabel("Localização", { exact: true }).fill("BR-116, km 312, Guarulhos – SP");
  await page.getByLabel("Selecionar anexos").setInputFiles({ name: "documento.txt", mimeType: "text/plain", buffer: Buffer.from("Anexo demonstrativo") });
  await page.getByRole("button", { name: "Abrir Chamado" }).click();
  await expect(page.getByRole("heading", { name: "Chamado aberto!" })).toBeVisible();
  await page.getByRole("link", { name: "Ir ao Dashboard" }).click();
  await page.getByRole("link", { name: "#VF-1025", exact: true }).click();
  await expect(page).toHaveURL(/\/chamados\/VF-1025$/);
  await expect(page.getByText("documento.txt")).toBeVisible();
  await page.getByLabel("Adicionar atualização ao histórico").fill("Cliente aguardando assistência");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await page.getByRole("link", { name: "Triagem", exact: true }).click();
  await expect(page).toHaveURL(/\/triagem$/);
  await page.getByRole("button", { name: /Crítica SLA 2h/ }).click();
  await page.getByLabel("Justificativa da prioridade").fill("Veículo imobilizado");
  await page.getByRole("button", { name: "Confirmar Triagem" }).click();
  await expect(page.getByRole("heading", { name: "Triagem confirmada!" })).toBeVisible();
  await page.getByRole("link", { name: "Encaminhar", exact: true }).click();
  await expect(page).toHaveURL(/\/encaminhamento$/);
  await page.getByRole("button", { name: /Assistência Suporte mecânico/ }).click();
  await page.getByRole("button", { name: /Carlos Mendes/ }).click();
  await page.getByRole("button", { name: "Encaminhar", exact: true }).click();
  await expect(page.getByText("Chamado encaminhado para Carlos Mendes · Assistência")).toBeVisible();
  await page.getByRole("button", { name: "Aguardando", exact: true }).click();
  await page.getByRole("button", { name: "Atualizar Status" }).click();
  await page.getByRole("link", { name: "Voltar ao chamado", exact: true }).click();
  await expect(page.getByText("Cliente aguardando assistência")).toBeVisible();
  await expect(page.getByText(/Prioridade Crítica · Mecânico · Veículo imobilizado/)).toBeVisible();
  await page.getByRole("button", { name: "Incluir Serviço Terceirizado" }).click();
  await page.getByRole("button", { name: "Acionar Parceiro" }).click();
  await expect(page.getByText("Preencha o parceiro e o tipo de serviço.")).toBeVisible();
  await page.getByRole("button", { name: /Outro \(inserir manualmente\)/ }).click();
  await page.getByLabel("Nome do parceiro *").fill("Parceiro E2E");
  await page.getByRole("button", { name: "Reparo mecânico", exact: true }).click();
  await page.getByRole("button", { name: "Acionar Parceiro" }).click();
  await page.getByRole("link", { name: "Ver acompanhamento completo" }).click();
  await expect(page).toHaveURL(/\/acompanhamento$/);
  await expect(page.getByText("Parceiro E2E", { exact: true })).toBeVisible();
  await page.getByLabel("Observação do atendimento do parceiro").fill("Parceiro confirmou recebimento");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Observação registrada com sucesso")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao chamado", exact: true }).last().click();
  await expect(page.getByText("Parceiro confirmou recebimento")).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("navigation").getByRole("link", { name: /Lixeira/ }).click();
  await expect(page).toHaveURL(/\/lixeira$/);
  await page.getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText("Lixeira vazia", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: "#VF-1025", exact: true }).click();
  await expect(page.getByText("Parceiro confirmou recebimento")).toBeVisible();
  await expect(page.getByText("Parceiro E2E", { exact: true })).toBeVisible();
  expect(erros).toEqual([]);
});

test("rotas diretas, recarregamento e ID inexistente", async ({ page }, testInfo) => {
  for (const [url, titulo] of [
    ["/", "Dashboard"], ["/chamados/novo", "#VF-1025 — Novo Chamado"], ["/chamados/VF-1024", "#VF-1024"],
    ["/chamados/VF-1024/triagem", "Triagem — #VF-1024"], ["/chamados/VF-1024/encaminhamento", "Encaminhamento — #VF-1024"],
    ["/chamados/VF-1024/acompanhamento", "Acompanhamento do Serviço"], ["/lixeira", "Lixeira"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`${url.replaceAll("/", "-") || "dashboard"}.png`), fullPage: true });
  }
  await page.goto("/chamados/VF-1024");
  await page.reload();
  await expect(page.getByRole("heading", { name: "#VF-1024", exact: true })).toBeVisible();
  await page.goto("/chamados/inexistente");
  await expect(page.getByRole("heading", { name: "Chamado não encontrado" })).toBeVisible();
  await page.goto("/chamados/VF-1023/acompanhamento");
  await expect(page.getByRole("heading", { name: "Nenhum serviço terceirizado vinculado" })).toBeVisible();
});

test("filtros, confirmação de exclusão e esvaziamento da lixeira", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar chamados").fill("Ricardo");
  await expect(page.getByRole("row").filter({ hasText: "Ricardo Almeida" })).toBeVisible();
  await page.getByRole("button", { name: "Alta", exact: true }).click();
  await expect(page.getByText("Nenhum chamado encontrado com os filtros aplicados.")).toBeVisible();
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page.getByRole("button", { name: "Excluir chamado VF-1024" }).click();
  await page.getByRole("button", { name: "Cancelar exclusão" }).click();
  await page.getByRole("button", { name: "Excluir chamado VF-1024" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: /Lixeira/ }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar exclusão definitiva" }).click();
  await page.getByRole("button", { name: "Esvaziar lixeira" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Ricardo Almeida")).toBeVisible();
  await page.getByRole("button", { name: "Esvaziar lixeira" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Lixeira vazia", { exact: true })).toBeVisible();
});

test("largura de 375px mantém navegação e formulário utilizáveis", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of ["/", "/chamados/novo", "/chamados/VF-1024", "/chamados/VF-1024/acompanhamento"]) {
    await page.goto(url);
    await expect(page.getByRole("main")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`mobile${url.replaceAll("/", "-")}.png`), fullPage: true });
    const dimensoes = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      elementos: Array.from(document.querySelectorAll("main *")).filter((el) => el.getBoundingClientRect().right > window.innerWidth).map((el) => ({ tag: el.tagName, classe: el.className, direita: el.getBoundingClientRect().right })),
    }));
    expect(dimensoes.largura, `${url}: ${JSON.stringify(dimensoes)}`).toBeLessThanOrEqual(dimensoes.viewport);
  }
  await page.getByRole("navigation").getByRole("link", { name: "Novo Chamado" }).click();
  await expect(page.getByLabel("Nome *")).toBeVisible();
});
