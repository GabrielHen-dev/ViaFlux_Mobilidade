package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
public record ContextoResponse(String id, String descricao, TipoChamado tipo, int urgencia) {

    public static ContextoResponse de(Contexto contexto) {
        return contexto == null ? null : new ContextoResponse(contexto.getId(), contexto.getDescricao(), contexto.getTipo(), contexto.getUrgencia());
    }
}
