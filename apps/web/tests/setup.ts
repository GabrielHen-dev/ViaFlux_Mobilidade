import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), caminho: "/", busca: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.push, replace: navegacao.replace }),
  usePathname: () => navegacao.caminho,
  useSearchParams: () => new URLSearchParams(navegacao.busca),
}));

class ObservadorDeTamanhoFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) Object.assign(globalThis, { ResizeObserver: ObservadorDeTamanhoFalso });
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

vi.mock("@/components/mapa/Mapa", () => ({
  default: ({ rotulo }: { rotulo: string }) => createElement("div", { role: "region", "aria-label": rotulo }),
}));

export { navegacao };
