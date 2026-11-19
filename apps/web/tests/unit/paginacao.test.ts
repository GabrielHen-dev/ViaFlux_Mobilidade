import { describe, expect, it } from "vitest";
import { fatiarPagina, paginasVisiveis } from "@/components/ui/Paginacao";

describe("paginasVisiveis", () => {
  it("mostra todas quando são poucas", () => {
    expect(paginasVisiveis(0, 1)).toEqual([0]);
    expect(paginasVisiveis(1, 3)).toEqual([0, 1, 2]);
  });

  it("resume as do meio com reticências mantendo primeira, última e vizinhas", () => {
    expect(paginasVisiveis(5, 10)).toEqual([0, "reticencias-inicio", 4, 5, 6, "reticencias-fim", 9]);
    expect(paginasVisiveis(0, 10)).toEqual([0, 1, "reticencias-fim", 9]);
    expect(paginasVisiveis(9, 10)).toEqual([0, "reticencias-inicio", 8, 9]);
  });
});

describe("fatiarPagina", () => {
  const itens = Array.from({ length: 12 }, (_, indice) => indice);

  it("devolve só os itens da página pedida", () => {
    expect(fatiarPagina(itens, 1, 5)).toEqual({ itens: [5, 6, 7, 8, 9], pagina: 1, totalDePaginas: 3 });
    expect(fatiarPagina(itens, 2, 5).itens).toEqual([10, 11]);
  });

  it("volta para a última página existente quando a lista encolhe", () => {
    expect(fatiarPagina(itens.slice(0, 4), 2, 5)).toEqual({ itens: [0, 1, 2, 3], pagina: 0, totalDePaginas: 1 });
  });

  it("trata lista vazia como uma página vazia", () => {
    expect(fatiarPagina([], 0, 5)).toEqual({ itens: [], pagina: 0, totalDePaginas: 1 });
  });
});
