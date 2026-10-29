import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampoDeLocalizacao from "@/components/forms/CampoDeLocalizacao";
import { buscarEnderecos, buscarPorCep, buscarPorCoordenadas } from "@/services/api/enderecos";
import { ErroApi } from "@/services/api/cliente";
import type { EnderecoEncontrado, Localizacao } from "@/types/chamado";
import { LOCALIZACAO_VAZIA, comEnderecoFormatado, completarLocalizacao, formatarCep, formatarEndereco } from "@/utils/endereco";

const apiFalsa = vi.hoisted(() => ({ requisitar: vi.fn(), baixar: vi.fn() }));

vi.mock("@/store/AuthContext", () => ({ useApi: () => apiFalsa }));
vi.mock("@/services/api/enderecos");

const PAULISTA: EnderecoEncontrado = {
  descricao: "Avenida Paulista, 1500 · Bela Vista · São Paulo – SP",
  cep: "01310-200",
  logradouro: "Avenida Paulista",
  numero: "1500",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
  latitude: -23.5614,
  longitude: -46.6558,
};

function renderizarCampo(inicial: Localizacao = LOCALIZACAO_VAZIA) {
  const aoAlterar = vi.fn<(localizacao: Localizacao) => void>();
  function Formulario() {
    const [valor, setValor] = useState(inicial);
    return (
      <CampoDeLocalizacao
        id="local"
        valor={valor}
        aoAlterar={(nova) => { setValor(nova); aoAlterar(nova); }}
        inputClassName="campo"
      />
    );
  }
  render(<Formulario />);
  return { aoAlterar, ultimoValor: () => aoAlterar.mock.lastCall?.[0] };
}

function ligarGps(resposta: (sucesso: PositionCallback, falha: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn((sucesso: PositionCallback, falha: PositionErrorCallback) => resposta(sucesso, falha)) },
  });
}

function posicao(latitude: number, longitude: number) {
  return { coords: { latitude, longitude, accuracy: 10 }, timestamp: Date.now() } as GeolocationPosition;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "geolocation");
});

describe("campo de localização", () => {
  it("preenche rua, bairro, cidade e UF pelo CEP sem apagar o número", async () => {
    const usuario = userEvent.setup();
    vi.mocked(buscarPorCep).mockResolvedValue({ ...PAULISTA, cep: "01310-100", numero: "", latitude: null, longitude: null });
    const { ultimoValor } = renderizarCampo();

    await usuario.type(screen.getByLabelText("Número"), "1500");
    await usuario.type(screen.getByLabelText("CEP"), "01310100");

    await waitFor(() => expect(screen.getByLabelText(/Rua, avenida ou rodovia/)).toHaveValue("Avenida Paulista"));
    expect(buscarPorCep).toHaveBeenCalledTimes(1);
    expect(buscarPorCep).toHaveBeenCalledWith(apiFalsa, "01310100");
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-100");
    expect(screen.getByLabelText("Número")).toHaveValue("1500");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Bela Vista");
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("UF")).toHaveTextContent("SP");
    expect(ultimoValor()?.endereco).toBe("Avenida Paulista, 1500 · Bela Vista · São Paulo – SP · CEP 01310-100");
    expect(screen.getByText("Não sabe o CEP? Use sua localização ou digite o nome da rua.")).toBeInTheDocument();
  });

  it("avisa quando o CEP não existe", async () => {
    const usuario = userEvent.setup();
    vi.mocked(buscarPorCep).mockRejectedValue(new ErroApi(404, "CEP não encontrado."));
    renderizarCampo();

    await usuario.type(screen.getByLabelText("CEP"), "99999999");

    expect(await screen.findByRole("alert")).toHaveTextContent("CEP não encontrado");
  });

  it("usa o GPS e preenche todos os campos com o endereço encontrado", async () => {
    const usuario = userEvent.setup();
    ligarGps((sucesso) => sucesso(posicao(-23.561414, -46.655881)));
    vi.mocked(buscarPorCoordenadas).mockResolvedValue(PAULISTA);
    const { ultimoValor } = renderizarCampo();

    await usuario.click(screen.getByRole("button", { name: "Usar minha localização" }));

    await waitFor(() => expect(screen.getByLabelText(/Rua, avenida ou rodovia/)).toHaveValue("Avenida Paulista"));
    expect(screen.getByText("Localização obtida com sucesso.")).toBeInTheDocument();
    expect(screen.queryByText(/Localização encontrada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/GPS registrado/)).not.toBeInTheDocument();
    expect(buscarPorCoordenadas).toHaveBeenCalledWith(apiFalsa, -23.561414, -46.655881);
    expect(screen.getByLabelText(/Rua, avenida ou rodovia/)).toHaveValue("Avenida Paulista");
    expect(screen.getByLabelText("Número")).toHaveValue("1500");
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-200");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Bela Vista");
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("UF")).toHaveTextContent("SP");
    expect(ultimoValor()).toMatchObject({ latitude: -23.561414, longitude: -46.655881, endereco: formatarEndereco(ultimoValor()!) });

    await usuario.type(screen.getByLabelText("Complemento / ponto de referência"), "Em frente ao posto");
    expect(ultimoValor()?.complemento).toBe("Em frente ao posto");
    expect(ultimoValor()?.endereco).toContain("Em frente ao posto");
  });

  it("guarda as coordenadas quando não consegue identificar a rua", async () => {
    const usuario = userEvent.setup();
    ligarGps((sucesso) => sucesso(posicao(-22.5, -44.7)));
    vi.mocked(buscarPorCoordenadas).mockRejectedValue(new ErroApi(503, "Indisponível"));
    const { ultimoValor } = renderizarCampo();

    await usuario.click(screen.getByRole("button", { name: "Usar minha localização" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("não conseguimos identificar a rua");
    expect(ultimoValor()).toMatchObject({ latitude: -22.5, longitude: -44.7, endereco: "-22.50000, -44.70000", logradouro: "" });
  });

  it("mostra a mensagem do GPS quando a permissão é negada", async () => {
    const usuario = userEvent.setup();
    ligarGps((_, falha) => falha({ code: 1, message: "negado" } as GeolocationPositionError));
    renderizarCampo();

    await usuario.click(screen.getByRole("button", { name: "Usar minha localização" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Permissão de localização negada");
    expect(buscarPorCoordenadas).not.toHaveBeenCalled();
  });

  it("sugere ruas pelo nome e preenche tudo ao escolher pelo teclado", async () => {
    const usuario = userEvent.setup();
    const outra = { ...PAULISTA, descricao: "Avenida Paulista · Rio de Janeiro – RJ", cidade: "Rio de Janeiro", uf: "RJ", numero: "", cep: "" };
    vi.mocked(buscarEnderecos).mockResolvedValue([outra, PAULISTA]);
    const { ultimoValor } = renderizarCampo();
    const rua = screen.getByRole("combobox", { name: /Rua, avenida ou rodovia/ });

    await usuario.type(rua, "Av Paulista");

    const lista = await screen.findByRole("listbox", { name: "Sugestões de endereço" }, { timeout: 2000 });
    expect(within(lista).getAllByRole("option")).toHaveLength(2);
    expect(buscarEnderecos).toHaveBeenCalledTimes(1);
    expect(buscarEnderecos).toHaveBeenCalledWith(apiFalsa, "Av Paulista", null);
    expect(rua).toHaveAttribute("aria-expanded", "true");

    await usuario.keyboard("{ArrowDown}{ArrowDown}");
    expect(rua).toHaveAttribute("aria-activedescendant", "local-sugestao-1");
    await usuario.keyboard("{Enter}");

    expect(rua).toHaveValue("Avenida Paulista");
    expect(rua).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox", { name: "Sugestões de endereço" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("UF")).toHaveTextContent("SP");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Bela Vista");
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-200");
    expect(ultimoValor()).toMatchObject({ latitude: -23.5614, longitude: -46.6558, numero: "1500" });
  });

  it("escolhe a sugestão com toque e envia a posição atual para priorizar resultados próximos", async () => {
    const usuario = userEvent.setup();
    vi.mocked(buscarEnderecos).mockResolvedValue([PAULISTA]);
    renderizarCampo({ ...LOCALIZACAO_VAZIA, latitude: -23.56, longitude: -46.66, endereco: "-23.56000, -46.66000" });

    await usuario.type(screen.getByRole("combobox", { name: /Rua/ }), "Paulista");
    await usuario.click(await screen.findByRole("option", { name: PAULISTA.descricao }, { timeout: 2000 }));

    expect(buscarEnderecos).toHaveBeenCalledWith(apiFalsa, "Paulista", { latitude: -23.56, longitude: -46.66 });
    expect(screen.getByRole("combobox", { name: /Rua/ })).toHaveValue("Avenida Paulista");
  });

  it("aproveita o texto livre de um rascunho antigo como nome da rua", () => {
    renderizarCampo({ endereco: "BR-116, km 312", latitude: null, longitude: null } as Localizacao);

    expect(screen.getByRole("combobox", { name: /Rua/ })).toHaveValue("BR-116, km 312");
  });
});

describe("formatação do endereço", () => {
  it("monta a linha do endereço a partir dos campos", () => {
    const localizacao = completarLocalizacao({
      logradouro: " Avenida Paulista ", numero: "1500", complemento: "Bloco B", bairro: "Bela Vista",
      cidade: "São Paulo", uf: "SP", cep: "01310100",
    });

    expect(formatarEndereco(localizacao)).toBe("Avenida Paulista, 1500 · Bloco B · Bela Vista · São Paulo – SP · CEP 01310-100");
  });

  it("omite partes vazias e CEP incompleto", () => {
    expect(formatarEndereco(completarLocalizacao({ logradouro: "Rodovia Presidente Dutra", numero: "km 312", cep: "0131" })))
      .toBe("Rodovia Presidente Dutra, km 312");
    expect(formatarEndereco(LOCALIZACAO_VAZIA)).toBe("");
  });

  it("usa as coordenadas quando não há endereço", () => {
    expect(comEnderecoFormatado(completarLocalizacao({ latitude: -23.5, longitude: -46.6 })).endereco).toBe("-23.50000, -46.60000");
  });

  it("aplica a máscara do CEP", () => {
    expect(formatarCep("01310100")).toBe("01310-100");
    expect(formatarCep("013")).toBe("013");
    expect(formatarCep("01310-1009")).toBe("01310-100");
  });
});
