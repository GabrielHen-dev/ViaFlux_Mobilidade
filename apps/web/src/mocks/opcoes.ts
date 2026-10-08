import { Factory, Monitor, Wallet, Wrench } from "lucide-react";

// Valores demonstrativos do Figma; não representam regras oficiais do domínio.
export const parceirosCredenciados = [
  { nome: "Guincho ViaRápido", telefone: "(11) 98000-1234", tipo: "Guincho / Remoção" },
  { nome: "Oficina TechTruck", telefone: "(11) 97111-5500", tipo: "Mecânica" },
  { nome: "ElétricaPRO Frotas", telefone: "(21) 96222-8877", tipo: "Elétrico / Eletrônico" },
  { nome: "PneuService 24h", telefone: "(31) 95333-2200", tipo: "Borracharia" },
  { nome: "Outro (inserir manualmente)", telefone: "", tipo: "" },
];

export const tiposServico = [
  "Remoção do veículo",
  "Reparo mecânico",
  "Reparo elétrico",
  "Troca de pneu",
  "Abastecimento",
  "Outro",
];

export const tipos = ["Mecânico", "Sistema", "Financeiro", "Outro"] as const;
export const gravidades = [
  { label: "Baixa", sla: "24h", color: "#16A34A", bg: "#F0FDF4", desc: "Sem risco imediato ao veículo ou motorista." },
  { label: "Média", sla: "8h", color: "#CA8A04", bg: "#FEFCE8", desc: "Situação controlada, requer atenção em breve." },
  { label: "Alta", sla: "4h", color: "#EA580C", bg: "#FFF7ED", desc: "Risco de agravamento. Mobilizar equipe." },
  { label: "Crítica", sla: "2h", color: "#DC2626", bg: "#FEF2F2", desc: "Risco imediato. Atendimento urgente." },
] as const;

export const setores = [
  { id: "Assistência", icon: Wrench, desc: "Suporte mecânico em campo" },
  { id: "TI", icon: Monitor, desc: "Sistemas e telemetria" },
  { id: "Manutenção", icon: Factory, desc: "Reparo em oficina" },
  { id: "Financeiro", icon: Wallet, desc: "Reembolsos e custos" },
];

export const responsaveis: Record<string, string[]> = {
  "Assistência": ["Carlos Mendes", "Roberto Souza", "Marcelo Dias"],
  "TI": ["Ana Silveira", "Felipe Torres", "Priya Nair"],
  "Manutenção": ["Wagner Costa", "Diego Alves"],
  "Financeiro": ["Juliana Ramos", "Cláudia Freitas"],
};

export const statuses = ["Aberto", "Em triagem", "Em atendimento", "Aguardando", "Resolvido", "Encerrado"] as const;

export const statusColor: Record<string, string> = {
    "Aberto": "#2563EB",
    "Em triagem": "#EA580C",
    "Em atendimento": "#059669",
    "Aguardando": "#7C3AED",
    "Resolvido": "#16A34A",
    "Encerrado": "#64748B",
  };
