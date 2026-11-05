package br.com.viaflux.api.chamado.servico;

public enum StatusServico{
    SOLICITADO("Solicitado"),
    RECEBIDO("Recebido"),
    EM_EXECUCAO("Em execução"),
    CONCLUIDO("Concluído");

    private final String rotulo;

    StatusServico(String rotulo) {
        this.rotulo = rotulo;
    }

    public String getRotulo() {
        return rotulo;
    }

    public boolean vemAntesDe(StatusServico outro) {
        return ordinal() < outro.ordinal();
    }
}
