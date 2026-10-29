import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import Select, { type OpcaoDoSelect } from "@/components/ui/Select";
import { etapaVigente, slaVencido } from "@/components/ui/SlaIndicador";
import { podeEscalonar } from "@/components/chamados/EscalonamentoDoChamado";
import type { ChamadoResumo, PrazoSla, Sla } from "@/types/chamado";

const OPCOES: OpcaoDoSelect[] = [
  { valor: "", rotulo: "Todos os status" },
  { valor: "FILA", rotulo: "Na fila", grupo: "Ativos" },
  { valor: "ATENDIMENTO", rotulo: "Em atendimento", grupo: "Ativos" },
  { valor: "FECHADO", rotulo: "Fechado", grupo: "Encerrados", desabilitada: true },
];

function SelectControlado({ inicial = "" }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <label htmlFor="status">Status</label>
      <Select id="status" value={valor} onChange={setValor} opcoes={OPCOES} />
      <output>{valor || "vazio"}</output>
    </>
  );
}

describe("Select", () => {
  it("abre a lista, agrupa as opções e escolhe com o mouse", async () => {
    const usuario = userEvent.setup();
    render(<SelectControlado />);

    const gatilho = screen.getByRole("combobox", { name: "Status" });
    expect(gatilho).toHaveTextContent("Todos os status");
    await usuario.click(gatilho);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
    await usuario.click(screen.getByRole("option", { name: "Em atendimento" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("ATENDIMENTO");
    expect(gatilho).toHaveFocus();
  });

  it("navega pelo teclado e ignora opções desabilitadas", async () => {
    const usuario = userEvent.setup();
    render(<SelectControlado />);

    screen.getByRole("combobox", { name: "Status" }).focus();
    await usuario.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("ATENDIMENTO");
  });

  it("fecha com Escape sem alterar o valor", async () => {
    const usuario = userEvent.setup();
    render(<SelectControlado inicial="FILA" />);

    await usuario.click(screen.getByRole("combobox", { name: "Status" }));
    await usuario.keyboard("{ArrowDown}{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("FILA");
  });

  it("seleciona pela primeira letra com a lista fechada", async () => {
    const usuario = userEvent.setup();
    render(<SelectControlado />);

    screen.getByRole("combobox", { name: "Status" }).focus();
    await usuario.keyboard("e");

    expect(screen.getByRole("status")).toHaveTextContent("ATENDIMENTO");
  });
});

const prazo = (mudancas: Partial<PrazoSla> = {}): PrazoSla => ({ limite: "2026-10-21T10:15:00-03:00", cumpridoEm: null, situacao: "NO_PRAZO", ...mudancas });
const sla = (primeiraResposta: PrazoSla, resolucao: PrazoSla): Sla => ({ primeiraResposta, resolucao, pausado: false, tempoPausadoMinutos: 0 });

describe("SLA em etapas", () => {
  it("acompanha o início do atendimento até ele ser cumprido e depois a solução", () => {
    expect(etapaVigente(sla(prazo(), prazo())).etapa).toBe("INICIO");
    const iniciado = sla(prazo({ cumpridoEm: "2026-10-21T10:05:00-03:00", situacao: "CUMPRIDO" }), prazo({ situacao: "EM_RISCO" }));
    expect(etapaVigente(iniciado)).toMatchObject({ etapa: "SOLUCAO", concluido: false });
    expect(etapaVigente(iniciado).prazo.situacao).toBe("EM_RISCO");
  });

  it("considera vencido só o prazo em aberto que estourou", () => {
    expect(slaVencido(sla(prazo({ situacao: "VIOLADO" }), prazo()))).toBe(true);
    expect(slaVencido(sla(prazo({ cumpridoEm: "2026-10-21T10:30:00-03:00", situacao: "CUMPRIDO_COM_ATRASO" }), prazo()))).toBe(false);
    expect(slaVencido(null)).toBe(false);
  });

  it("libera o escalonamento só para chamado ativo, vencido e ainda não escalonado", () => {
    const vencido = sla(prazo({ situacao: "VIOLADO" }), prazo());
    const chamado = { status: "Em atendimento", sla: vencido, escalonamento: null } as unknown as ChamadoResumo;
    expect(podeEscalonar(chamado)).toBe(true);
    expect(podeEscalonar({ ...chamado, status: "Resolvido" })).toBe(false);
    expect(podeEscalonar({ ...chamado, escalonamento: { em: "2026-10-21T10:40:00-03:00", por: null, observacao: null } })).toBe(false);
    expect(podeEscalonar({ ...chamado, sla: sla(prazo(), prazo()) })).toBe(false);
  });
});
