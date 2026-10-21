package br.com.viaflux.api.chamado.sla;

public enum SituacaoPrazo {
    NO_PRAZO,
    EM_RISCO,
    VIOLADO,
    CUMPRIDO,
    CUMPRIDO_COM_ATRASO;

    public boolean emAberto() {
        return this == NO_PRAZO || this == EM_RISCO || this == VIOLADO;
    }
}
