package br.com.viaflux.api.chamado;

public enum PrazoDeSla {
    PRIMEIRA_RESPOSTA("Primeira resposta"),
    RESOLUCAO("Resolução");

    private final String rotulo;

    PrazoDeSla(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}
