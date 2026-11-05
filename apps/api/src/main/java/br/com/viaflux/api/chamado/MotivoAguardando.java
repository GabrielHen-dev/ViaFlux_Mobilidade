package br.com.viaflux.api.chamado;

public enum MotivoAguardando {
    CLIENTE("cliente"),
    FORNECEDOR("fornecedor"),
    OUTRO_DEPARTAMENTO("outro departamento");

    private final String rotulo;

    MotivoAguardando(String rotulo) {
        this.rotulo = rotulo;
    }

    public String getRotulo() {
        return rotulo;
    }
}
