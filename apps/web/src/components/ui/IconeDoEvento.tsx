import {
  ArrowRightLeft, Bell, CirclePlus, ClipboardCheck, Clock, Forward, Hand, MapPin, NotebookPen, Paperclip, Scale, Truck, Zap, type LucideIcon, type LucideProps,
} from "lucide-react";
import type { TipoEvento } from "@/types/chamado";

const ICONE_POR_TIPO: Record<TipoEvento, LucideIcon> = {
  ABERTURA: CirclePlus,
  TRIAGEM: Hand,
  CLASSIFICACAO: ClipboardCheck,
  RECLASSIFICACAO: ClipboardCheck,
  OVERRIDE: Scale,
  ROTEAMENTO: Forward,
  TRANSFERENCIA: ArrowRightLeft,
  STATUS: Zap,
  ATUALIZACAO: NotebookPen,
  ANEXO: Paperclip,
  LOCALIZACAO: MapPin,
  SLA: Clock,
  FORNECEDOR: Truck,
  NOTIFICACAO: Bell,
};

export default function IconeDoEvento({ tipo, ...props }: { tipo: TipoEvento } & LucideProps) {
  const Icone = ICONE_POR_TIPO[tipo];
  return <Icone aria-hidden {...props} />;
}
