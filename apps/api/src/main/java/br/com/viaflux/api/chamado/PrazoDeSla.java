package br.com.viaflux.api.chamado;

enum PrazoDeSla {
    PRIMEIRA_RESPOSTA("Primeira resposta"),
    RESOLUCAO("Resolução");

    private final String rotulo;

    PrazoDeSla(String rotulo) {
        this.rotulo = rotulo;
    }

    String rotulo() {
        return rotulo;
    }
}
