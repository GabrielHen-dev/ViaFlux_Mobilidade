import type { EnderecoEncontrado, Localizacao } from "@/types/chamado";

export const LOCALIZACAO_VAZIA: Localizacao = {
  endereco: "",
  latitude: null,
  longitude: null,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export function completarLocalizacao(parcial: Partial<Localizacao> | null | undefined): Localizacao {
  return { ...LOCALIZACAO_VAZIA, ...(parcial ?? {}) };
}

export function formatarCep(cep: string) {
  const digitos = cep.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function formatarEndereco(localizacao: Localizacao) {
  const rua = [localizacao.logradouro.trim(), localizacao.numero.trim()].filter(Boolean).join(", ");
  const cidade = [localizacao.cidade.trim(), localizacao.uf.trim()].filter(Boolean).join(" – ");
  const partes = [rua, localizacao.complemento.trim(), localizacao.bairro.trim(), cidade];
  const cep = localizacao.cep.replace(/\D/g, "");
  if (cep.length === 8) partes.push(`CEP ${formatarCep(cep)}`);
  return partes.filter(Boolean).join(" · ");
}

export function temEnderecoEstruturado(localizacao: Localizacao) {
  return Boolean(localizacao.logradouro.trim() || localizacao.cidade.trim() || localizacao.cep.trim());
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function descreverCoordenadas(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function temCoordenadas(localizacao: Localizacao): localizacao is Localizacao & { latitude: number; longitude: number } {
  return localizacao.latitude !== null && localizacao.longitude !== null;
}

export function comEnderecoFormatado(localizacao: Localizacao): Localizacao {
  const endereco = formatarEndereco(localizacao)
    || (temCoordenadas(localizacao) ? descreverCoordenadas(localizacao.latitude, localizacao.longitude) : "");
  return { ...localizacao, endereco };
}

export function preencherComEnderecoEncontrado(atual: Localizacao, encontrado: EnderecoEncontrado): Localizacao {
  return {
    ...atual,
    cep: formatarCep(encontrado.cep),
    logradouro: encontrado.logradouro,
    numero: encontrado.numero || atual.numero,
    bairro: encontrado.bairro,
    cidade: encontrado.cidade,
    uf: encontrado.uf,
    latitude: encontrado.latitude ?? atual.latitude,
    longitude: encontrado.longitude ?? atual.longitude,
  };
}

export function preencherComCep(atual: Localizacao, encontrado: EnderecoEncontrado): Localizacao {
  return {
    ...atual,
    cep: formatarCep(encontrado.cep || atual.cep),
    logradouro: encontrado.logradouro || atual.logradouro,
    bairro: encontrado.bairro || atual.bairro,
    cidade: encontrado.cidade || atual.cidade,
    uf: encontrado.uf || atual.uf,
  };
}

export function linkNoOpenStreetMap(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}
