import { CirclePlus, ClipboardCheck, Forward, NotebookPen, Truck, Zap, type LucideIcon, type LucideProps } from "lucide-react";
import type { IconeEvento } from "@/types/chamado";

const iconesPorEvento: Record<IconeEvento, LucideIcon> = {
  aberto: CirclePlus,
  triagem: ClipboardCheck,
  encaminhado: Forward,
  atendimento: Zap,
  atualizacao: NotebookPen,
  parceiro: Truck,
};

export default function IconeDoEvento({ icone, ...props }: { icone: IconeEvento } & LucideProps) {
  const Icone = iconesPorEvento[icone];
  return <Icone {...props} />;
}
