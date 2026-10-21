package br.com.viaflux.api.chamado;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.UUID;

record FiltrosDeMetricas(LocalDate de, LocalDate ate, Prioridade prioridade, TipoChamado tipo, TipoChamado departamento, UUID fornecedor) {

    static FiltrosDeMetricas de(String de, String ate, String prioridade, String tipo, String departamento, String fornecedor) {
        LocalDate inicio = data(de);
        LocalDate fim = data(ate);
        if (inicio.isAfter(fim)) {
            throw periodoInvalido();
        }
        return new FiltrosDeMetricas(
                inicio,
                fim,
                vazio(prioridade) ? null : Prioridade.deCodigo(prioridade),
                vazio(tipo) ? null : tipoValido(tipo, "O tipo informado não é válido."),
                vazio(departamento) ? null : tipoValido(departamento, "O departamento informado não é válido."),
                vazio(fornecedor) ? null : fornecedorValido(fornecedor)
        );
    }

    private static LocalDate data(String valor) {
        if (vazio(valor)) {
            throw periodoInvalido();
        }
        try {
            return LocalDate.parse(valor.trim());
        } catch (DateTimeParseException erro) {
            throw periodoInvalido();
        }
    }

    private static FiltroChamadoInvalidoException periodoInvalido() {
        return new FiltroChamadoInvalidoException("Informe um período válido (data inicial menor ou igual à final).");
    }

    private static TipoChamado tipoValido(String valor, String mensagem) {
        try {
            return TipoChamado.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException(mensagem);
        }
    }

    private static UUID fornecedorValido(String valor) {
        try {
            return UUID.fromString(valor.trim());
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException("O fornecedor informado não é válido.");
        }
    }

    private static boolean vazio(String valor) {
        return valor == null || valor.isBlank();
    }
}
