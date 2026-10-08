// Horários do protótipo seguem o fuso da operação, independentemente do navegador.
export function horaAtual() {
  return new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
export function dataHoraAtual() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " às " + horaAtual();
}
