package br.com.viaflux.api.chamado;

public record SlaResponse(PrazoResponse primeiraResposta, PrazoResponse resolucao, boolean pausado, long tempoPausadoMinutos) {
}
