package br.com.viaflux.api.chamado;

import java.util.Set;

public enum Prioridade {
    P1("Crítica"),
    P2("Alta"),
    P3("Média"),
    P4("Baixa");

    private static final Set<Integer> PESOS = Set.of(1, 3, 5);

    private final String rotulo;

    Prioridade(String rotulo) {
        this.rotulo = rotulo;
    }

    public String getRotulo() {
        return rotulo;
    }

    public static Prioridade porScore(int score) {
        if (score >= 10) {
            return P1;
        }
        if (score >= 8) {
            return P2;
        }
        if (score >= 6) {
            return P3;
        }
        return P4;
    }

    public static int score(int severidade, int urgencia) {
        return severidade + urgencia;
    }

    public static boolean ehPeso(Integer valor) {
        return valor != null && PESOS.contains(valor);
    }

    public static String rotuloDoPeso(int peso) {
        return switch (peso) {
            case 5 -> "Alta";
            case 3 -> "Média";
            default -> "Baixa";
        };
    }

    public static Prioridade deCodigo(String codigo) {
        if (codigo != null) {
            for (Prioridade prioridade : values()) {
                if (prioridade.name().equalsIgnoreCase(codigo.trim())) {
                    return prioridade;
                }
            }
        }
        throw new FiltroChamadoInvalidoException("A prioridade informada não é válida.");
    }
}
