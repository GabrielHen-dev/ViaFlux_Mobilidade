import { useChamados } from "@/store/ChamadosContext";

export function useChamado(id: string) {
  const { chamados } = useChamados();
  return chamados.find((chamado) => chamado.id === id);
}
