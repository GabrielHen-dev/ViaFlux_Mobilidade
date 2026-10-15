package br.com.viaflux.api.chamado;

public record ChamadosResumoResponse(
        long total,
        long criticos,
        long emAtendimento,
        long aguardando
) {
}
