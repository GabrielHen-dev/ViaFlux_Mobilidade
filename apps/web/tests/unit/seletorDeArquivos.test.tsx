import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";

it("abre a câmera, captura um JPG e encerra a transmissão", async () => {
  const usuario = userEvent.setup();
  const parar = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: parar }] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((retorno) => retorno(new Blob(["foto"], { type: "image/jpeg" })));
  const aceitos: File[] = [];

  render(<SeletorDeArquivos aoAceitar={(arquivos) => aceitos.push(...arquivos)} />);
  await usuario.click(screen.getByRole("button", { name: "Tirar foto com a câmera" }));
  const video = await screen.findByLabelText("Prévia da câmera");
  expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: "environment" } }, audio: false });
  Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  fireEvent.loadedMetadata(video);
  await usuario.click(screen.getByRole("button", { name: "Fotografar" }));

  await waitFor(() => expect(aceitos).toHaveLength(1));
  expect(aceitos[0].type).toBe("image/jpeg");
  expect(parar).toHaveBeenCalledOnce();
  expect(screen.queryByLabelText("Prévia da câmera")).not.toBeInTheDocument();
});

it("explica a permissão negada e mantém a opção de anexar arquivo", async () => {
  const usuario = userEvent.setup();
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Acesso negado", "NotAllowedError")) },
  });

  render(<SeletorDeArquivos aoAceitar={() => {}} />);
  await usuario.click(screen.getByRole("button", { name: "Tirar foto com a câmera" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Permissão da câmera negada");
  expect(screen.getByRole("button", { name: /anexar arquivo/i })).toBeEnabled();
});
