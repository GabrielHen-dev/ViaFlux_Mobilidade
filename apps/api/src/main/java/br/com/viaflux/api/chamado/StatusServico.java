package br.com.viaflux.api.chamado;

enum StatusServico {
    SOLICITADO("Solicitado"),
    RECEBIDO("Recebido"),
    EM_EXECUCAO("Em execução"),
    CONCLUIDO("Concluído");

    private final String rotulo;

    StatusServico(String rotulo) {
        this.rotulo = rotulo;
    }

    String getRotulo() {
        return rotulo;
    }

    boolean vemAntesDe(StatusServico outro) {
        return ordinal() < outro.ordinal();
    }
}
