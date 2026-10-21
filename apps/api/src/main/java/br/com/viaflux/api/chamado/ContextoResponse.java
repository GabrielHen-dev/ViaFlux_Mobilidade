package br.com.viaflux.api.chamado;

public record ContextoResponse(String id, String descricao, TipoChamado tipo, int urgencia) {

    static ContextoResponse de(Contexto contexto) {
        return contexto == null ? null : new ContextoResponse(contexto.getId(), contexto.getDescricao(), contexto.getTipo(), contexto.getUrgencia());
    }
}
