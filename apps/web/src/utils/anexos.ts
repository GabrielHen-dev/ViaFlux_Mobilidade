const LIMITE_PADRAO_MB = 10;

export const TIPOS_DE_ANEXO_PERMITIDOS = ["image/png", "image/jpeg", "application/pdf"] as const;

export const EXTENSOES_PERMITIDAS = ".png,.jpg,.jpeg,.pdf";

export const LIMITE_ANEXO_MB = Number(process.env.NEXT_PUBLIC_ANEXO_LIMITE_MB) || LIMITE_PADRAO_MB;

export const LIMITE_ANEXO_BYTES = LIMITE_ANEXO_MB * 1024 * 1024;

export interface RejeicaoDeAnexo {
  motivo: "FORMATO" | "TAMANHO";
  mensagem: string;
}

export function motivoDeRejeicao(arquivo: { name: string; type: string; size: number }): RejeicaoDeAnexo | null {
  if (!(TIPOS_DE_ANEXO_PERMITIDOS as readonly string[]).includes(arquivo.type)) {
    return { motivo: "FORMATO", mensagem: `"${arquivo.name}" não foi aceito: envie fotos PNG ou JPG, ou documentos PDF.` };
  }
  if (arquivo.size > LIMITE_ANEXO_BYTES) {
    return { motivo: "TAMANHO", mensagem: `"${arquivo.name}" não foi aceito: o limite é de ${LIMITE_ANEXO_MB} MB por arquivo.` };
  }
  return null;
}

export function ehImagem(tipoConteudo: string) {
  return tipoConteudo.startsWith("image/");
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
