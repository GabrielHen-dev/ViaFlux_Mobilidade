import type { Chamado } from "@/types/chamado";

export type OrigemDaClassificacao = "PENDENTE" | "CATALOGO" | "RELATO" | "MANUAL";

const AUTOR_DA_CLASSIFICACAO_POR_CATALOGO = "Classificação automática";
const AUTOR_DA_CLASSIFICACAO_POR_RELATO = "Classificação automática por texto";
const ACAO_DA_CLASSIFICACAO_POR_RELATO = "Classificação automática pelo relato";

export function origemDaClassificacao(chamado: Pick<Chamado, "classificacao" | "triagem" | "timeline">): OrigemDaClassificacao {
  if (chamado.classificacao === null) return "PENDENTE";
  const autor = chamado.triagem.concluidaPor?.nome;
  if (autor === AUTOR_DA_CLASSIFICACAO_POR_RELATO) return "RELATO";
  if (autor === AUTOR_DA_CLASSIFICACAO_POR_CATALOGO) return "CATALOGO";
  if (chamado.timeline.some((evento) => evento.acao === ACAO_DA_CLASSIFICACAO_POR_RELATO) && chamado.triagem.revisaoPendente) return "RELATO";
  return "MANUAL";
}

export function termosReconhecidos(chamado: Pick<Chamado, "timeline">): string[] {
  const evento = chamado.timeline.find((item) => item.acao === ACAO_DA_CLASSIFICACAO_POR_RELATO);
  const trecho = evento?.detalhe.match(/termos:\s*([^·]+)/);
  if (!trecho) return [];
  return trecho[1].split(",").map((termo) => termo.trim()).filter((termo) => termo.length > 0);
}

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function partesDoRelato(texto: string, termos: string[]): { trecho: string; destaque: boolean }[] {
  if (termos.length === 0 || !texto) return [{ trecho: texto, destaque: false }];
  const alvos = new Set(termos.map(semAcento));
  return texto.split(/([\p{L}0-9]+)/u).filter((trecho) => trecho !== "").map((trecho) => ({ trecho, destaque: alvos.has(semAcento(trecho)) }));
}
