package br.com.viaflux.api.chamado;

import java.util.Set;

public enum TipoChamado {
    ASSISTENCIA_24H("Assistência 24h"),
    MANUTENCAO("Manutenção"),
    LOGISTICA("Logística"),
    TI("Tecnologia"),
    FINANCEIRO("Financeiro"),
    CONTRATOS("Contratos");

    private static final Set<TipoChamado> OPERACIONAIS = Set.of(ASSISTENCIA_24H, MANUTENCAO, LOGISTICA);

    private final String nome;

    TipoChamado(String nome) {
        this.nome = nome;
    }

    public String getNome() {
        return nome;
    }

    boolean isOperacional() {
        return OPERACIONAIS.contains(this);
    }

    static TipoChamado deCodigo(String codigo, String campo) {
        if (codigo != null) {
            for (TipoChamado tipo : values()) {
                if (tipo.name().equals(codigo.trim())) {
                    return tipo;
                }
            }
        }
        throw ErroDeChamado.campoInvalido(campo, "Selecione um departamento válido.");
    }
}
