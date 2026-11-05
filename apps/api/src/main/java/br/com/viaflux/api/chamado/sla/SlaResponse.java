package br.com.viaflux.api.chamado.sla;

public record SlaResponse(PrazoResponse primeiraResposta, PrazoResponse resolucao, boolean pausado, long tempoPausadoMinutos) {
}
