import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), caminho: "/" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.push, replace: navegacao.replace }),
  usePathname: () => navegacao.caminho,
}));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

export { navegacao };
