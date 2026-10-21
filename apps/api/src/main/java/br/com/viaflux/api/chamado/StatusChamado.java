package br.com.viaflux.api.chamado;

public enum StatusChamado {
    ABERTO("Aberto"),
    EM_TRIAGEM("Em triagem"),
    NA_FILA("Na fila"),
    EM_ATENDIMENTO("Em atendimento"),
    AGUARDANDO("Aguardando"),
    RESOLVIDO("Resolvido"),
    FECHADO("Fechado");

    private final String rotulo;

    StatusChamado(String rotulo) {
        this.rotulo = rotulo;
    }

    public String getRotulo() {
        return rotulo;
    }

    boolean aguardaTriagem() {
        return this == ABERTO || this == EM_TRIAGEM;
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
