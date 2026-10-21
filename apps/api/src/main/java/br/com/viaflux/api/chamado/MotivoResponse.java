package br.com.viaflux.api.chamado;

public record MotivoResponse(String id, String descricao, TipoChamado tipo, int severidade) {

    static MotivoResponse de(Motivo motivo) {
        return motivo == null ? null : new MotivoResponse(motivo.getId(), motivo.getDescricao(), motivo.getTipo(), motivo.getSeveridade());
    }
}
