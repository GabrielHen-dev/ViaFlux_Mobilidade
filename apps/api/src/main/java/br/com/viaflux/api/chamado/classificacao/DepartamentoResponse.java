package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
public record DepartamentoResponse(TipoChamado codigo, String nome) {

    public static DepartamentoResponse de(TipoChamado tipo) {
        return tipo == null ? null : new DepartamentoResponse(tipo, tipo.getNome());
    }
}
