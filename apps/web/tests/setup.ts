import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { reiniciarEstadoSimulado } from "@/services/api/simulacao/estado";
import { limparArquivosEmMemoria } from "@/services/api/simulacao/arquivos";
import { limparCacheDeAutores } from "@/services/api/simulacao/roteador";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), caminho: "/" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.push, replace: navegacao.replace }),
  usePathname: () => navegacao.caminho,
}));

beforeEach(() => {
  window.localStorage.clear();
  reiniciarEstadoSimulado();
  limparArquivosEmMemoria();
  limparCacheDeAutores();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

export { navegacao };
