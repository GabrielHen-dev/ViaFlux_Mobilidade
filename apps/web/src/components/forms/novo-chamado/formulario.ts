import { z } from "zod";
import type { Localizacao } from "@/types/chamado";
import { LOCALIZACAO_VAZIA } from "@/utils/endereco";
import { gerarId } from "@/utils/id";

const esquemaBase = z.object({
  solicitanteId: z.string(),
  cliente: z.string().trim().min(1, "Informe o nome do solicitante.").max(150, "Use no máximo 150 caracteres."),
  telefone: z.string().trim().max(30, "Use no máximo 30 caracteres."),
  motivoId: z.string().min(1, "Selecione o motivo da solicitação."),
  contextoId: z.string(),
  motivoOutro: z.string().max(200, "Use no máximo 200 caracteres."),
  descricao: z.string().trim().min(10, "Descreva o problema com pelo menos 10 caracteres."),
  modelo: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  placa: z.string().trim().max(20, "Use no máximo 20 caracteres."),
  endereco: z.string().trim().max(255, "Use no máximo 255 caracteres."),
});

function validarMotivoOutro(dados: z.infer<typeof esquemaBase>, contexto: z.RefinementCtx) {
  if (dados.motivoId === "OUTRO" && !dados.motivoOutro.trim()) contexto.addIssue({ code: "custom", path: ["motivoOutro"], message: "Descreva brevemente o motivo." });
  if (dados.motivoId !== "OUTRO" && !dados.contextoId) contexto.addIssue({ code: "custom", path: ["contextoId"], message: "Selecione o contexto situacional." });
}

export const esquemaDeAbertura = esquemaBase.superRefine(validarMotivoOutro);

export const esquemaDaCentral = esquemaBase.extend({
  solicitanteId: z.string().min(1, "Selecione o cliente solicitante."),
}).superRefine(validarMotivoOutro);

export type CampoDoFormulario = keyof z.infer<typeof esquemaDeAbertura>;
export type ErrosDoFormulario = Partial<Record<CampoDoFormulario, string>>;

export const ROTULO_DO_CAMPO: Record<CampoDoFormulario, string> = {
  solicitanteId: "Cliente solicitante",
  cliente: "Nome do solicitante",
  telefone: "Telefone",
  motivoId: "Motivo",
  contextoId: "Contexto situacional",
  motivoOutro: "Outro motivo",
  descricao: "Descrição",
  modelo: "Modelo do veículo",
  placa: "Placa",
  endereco: "Localização",
};

export const ID_DO_CAMPO: Record<CampoDoFormulario, string> = {
  solicitanteId: "novo-solicitante",
  cliente: "novo-cliente",
  telefone: "novo-telefone",
  motivoId: "novo-motivo",
  contextoId: "novo-contexto",
  motivoOutro: "novo-motivo-outro",
  descricao: "novo-descricao",
  modelo: "novo-modelo",
  placa: "novo-placa",
  endereco: "novo-localizacao",
};

export interface CamposDoRascunho {
  solicitanteId: string;
  cliente: string;
  telefone: string;
  motivoId: string;
  contextoId: string;
  motivoOutro: string;
  descricao: string;
  modelo: string;
  placa: string;
  localizacao: Localizacao;
}

export interface Rascunho {
  campos: CamposDoRascunho;
  chaveIdempotencia: string;
}

export interface ArquivoPendente {
  id: string;
  arquivo: File;
  situacao: "pendente" | "enviando" | "enviado" | "falhou";
  erro?: string;
}

export type AlterarCampo = <Campo extends keyof CamposDoRascunho>(campo: Campo, valor: CamposDoRascunho[Campo]) => void;

export const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
export const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all aria-[invalid=true]:border-red-400";

export function rascunhoVazio(nome: string): Rascunho {
  return {
    campos: { solicitanteId: "", cliente: nome, telefone: "", motivoId: "", contextoId: "", motivoOutro: "", descricao: "", modelo: "", placa: "", localizacao: LOCALIZACAO_VAZIA },
    chaveIdempotencia: gerarId(),
  };
}

export function propriedadesDoCampo(campo: CampoDoFormulario, erros: ErrosDoFormulario) {
  return {
    id: ID_DO_CAMPO[campo],
    "aria-invalid": erros[campo] ? true : undefined,
    "aria-describedby": erros[campo] ? `${ID_DO_CAMPO[campo]}-erro` : undefined,
  };
}
