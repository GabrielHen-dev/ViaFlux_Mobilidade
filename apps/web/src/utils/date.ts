const FUSO_DA_OPERACAO = "America/Fortaleza";
const MINUTO_MS = 60_000;

export function formatarDataHora(iso: string) {
  const data = new Date(iso);
  const dia = data.toLocaleDateString("pt-BR", { timeZone: FUSO_DA_OPERACAO });
  const hora = data.toLocaleTimeString("pt-BR", { timeZone: FUSO_DA_OPERACAO, hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

export function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO_DA_OPERACAO, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatarDuracao(minutosTotais: number) {
  const minutos = Math.max(0, Math.round(minutosTotais));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto ? `${horas}h ${resto}min` : `${horas}h`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  return horasRestantes ? `${dias}d ${horasRestantes}h` : `${dias}d`;
}

const SEGUNDOS_POR_DIA = 86_400;
const SEGUNDOS_POR_HORA = 3_600;

function comDoisDigitos(numero: number) {
  return String(numero).padStart(2, "0");
}

export function formatarContagem(milissegundos: number) {
  const totalDeSegundos = Math.floor(Math.abs(milissegundos) / 1000);
  const dias = Math.floor(totalDeSegundos / SEGUNDOS_POR_DIA);
  const horas = Math.floor((totalDeSegundos % SEGUNDOS_POR_DIA) / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((totalDeSegundos % SEGUNDOS_POR_HORA) / 60);
  const segundos = totalDeSegundos % 60;
  if (dias > 0) return `${dias}d ${horas}h ${comDoisDigitos(minutos)}min`;
  if (horas > 0) return `${horas}h ${comDoisDigitos(minutos)}min ${comDoisDigitos(segundos)}s`;
  return `${minutos}min ${comDoisDigitos(segundos)}s`;
}

export function descreverTempoAte(limiteIso: string, agora = new Date()) {
  const restante = new Date(limiteIso).getTime() - agora.getTime();
  return restante >= 0 ? `${formatarContagem(restante)} restantes` : `vencido há ${formatarContagem(restante)}`;
}

export function hojeNaOperacao(deslocamentoEmDias = 0) {
  const data = new Date(Date.now() + deslocamentoEmDias * 24 * 60 * MINUTO_MS);
  return data.toLocaleDateString("en-CA", { timeZone: FUSO_DA_OPERACAO });
}
