import type { ReactNode } from "react";
import { Check, CircleCheckBig, Clock, MapPin, Phone, Truck } from "lucide-react";
import type { StatusServico } from "@/types/chamado";
export const statusConfig: Record<StatusServico, { cor: string; bg: string; icone: ReactNode; label: string }> = {
  solicitado: {
    cor: "#CA8A04",
    bg: "#FEFCE8",
    label: "Solicitado",
    icone: <Clock size={14} strokeWidth={2.5} />,
  },
  acionado: {
    cor: "#7C3AED",
    bg: "#F5F3FF",
    label: "Parceiro acionado",
    icone: <Phone size={14} strokeWidth={2.5} />,
  },
  aceito: {
    cor: "#0369A1",
    bg: "#E0F2FE",
    label: "Aceito",
    icone: <Check size={14} strokeWidth={2.5} />,
  },
  a_caminho: {
    cor: "#2563EB",
    bg: "#DBEAFE",
    label: "A caminho",
    icone: <Truck size={14} strokeWidth={2.5} />,
  },
  recolhido: {
    cor: "#059669",
    bg: "#D1FAE5",
    label: "Veículo recolhido",
    icone: <MapPin size={14} strokeWidth={2.5} />,
  },
  concluido: {
    cor: "#10B981",
    bg: "#ECFDF5",
    label: "Concluído",
    icone: <CircleCheckBig size={14} strokeWidth={2.5} />,
  },
};
