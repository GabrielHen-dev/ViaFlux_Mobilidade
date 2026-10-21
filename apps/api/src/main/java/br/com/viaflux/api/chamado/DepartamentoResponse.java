package br.com.viaflux.api.chamado;

public record DepartamentoResponse(TipoChamado codigo, String nome) {

    static DepartamentoResponse de(TipoChamado tipo) {
        return tipo == null ? null : new DepartamentoResponse(tipo, tipo.getNome());
    }
}
