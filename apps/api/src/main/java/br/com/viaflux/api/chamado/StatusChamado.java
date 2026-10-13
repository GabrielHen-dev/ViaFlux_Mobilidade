package br.com.viaflux.api.chamado;

public enum StatusChamado {
    ABERTO("Aberto"),
    EM_TRIAGEM("Em triagem"),
    EM_ATENDIMENTO("Em atendimento"),
    AGUARDANDO("Aguardando"),
    RESOLVIDO("Resolvido"),
    ENCERRADO("Encerrado");

    private final String rotulo;

    StatusChamado(String rotulo) {
        this.rotulo = rotulo;
    }

    String getRotulo() {
        return rotulo;
    }

    static StatusChamado fromRotulo(String rotulo) {
        for (StatusChamado status : values()) {
            if (status.rotulo.equalsIgnoreCase(rotulo.trim())) {
                return status;
            }
        }
        throw new FiltroChamadoInvalidoException("O status informado não é válido.");
    }
}
