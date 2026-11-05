package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
public record MotivoResponse(String id, String descricao, TipoChamado tipo, int severidade) {

    public static MotivoResponse de(Motivo motivo) {
        return motivo == null ? null : new MotivoResponse(motivo.getId(), motivo.getDescricao(), motivo.getTipo(), motivo.getSeveridade());
    }
}
