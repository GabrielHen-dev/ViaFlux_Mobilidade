package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;

import java.util.Locale;

record FiltrosDeChamados(
        String busca,
        StatusChamado status,
        Prioridade prioridade,
        TipoChamado departamento,
        TipoChamado tipo,
        SituacaoPrazo sla,
        Etapa etapa,
        Ordenacao ordenacao
) {

    enum Etapa { TRIAGEM, ATENDIMENTO }

    enum Ordenacao { FILA, RECENTES }

    FiltrosDeChamados(String busca, StatusChamado status, Prioridade prioridade, TipoChamado departamento,
                      SituacaoPrazo sla, Etapa etapa, Ordenacao ordenacao) {
        this(busca, status, prioridade, departamento, null, sla, etapa, ordenacao);
    }

    static FiltrosDeChamados de(String busca, String status, String prioridade, String departamento, String sla, String etapa, String ordenacao) {
        return de(busca, status, prioridade, departamento, null, sla, etapa, ordenacao);
    }

    static FiltrosDeChamados de(String busca, String status, String prioridade, String departamento, String tipo, String sla, String etapa, String ordenacao) {
        return new FiltrosDeChamados(
                busca,
                vazio(status) ? null : StatusChamado.fromRotulo(status),
                vazio(prioridade) ? null : Prioridade.deCodigo(prioridade),
                vazio(departamento) ? null : departamentoValido(departamento),
                vazio(tipo) ? null : tipoValido(tipo),
                vazio(sla) ? null : situacaoFiltravel(sla),
                vazio(etapa) ? null : valor(Etapa.class, etapa, "A etapa informada não é válida."),
                vazio(ordenacao) ? Ordenacao.FILA : valor(Ordenacao.class, ordenacao, "A ordenação informada não é válida.")
        );
    }

    FiltrosDeChamados semStatus() {
        return new FiltrosDeChamados(busca, null, prioridade, departamento, tipo, sla, etapa, ordenacao);
    }

    private static boolean vazio(String valor) {
        return valor == null || valor.isBlank();
    }

    private static TipoChamado departamentoValido(String codigo) {
        try {
            return TipoChamado.valueOf(codigo.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException("O departamento informado não é válido.");
        }
    }

    private static TipoChamado tipoValido(String codigo) {
        try {
            return TipoChamado.valueOf(codigo.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException("O tipo informado não é válido.");
        }
    }

    private static SituacaoPrazo situacaoFiltravel(String valor) {
        SituacaoPrazo situacao = valor(SituacaoPrazo.class, valor, "A situação de SLA informada não é válida.");
        if (!situacao.emAberto()) {
            throw new FiltroChamadoInvalidoException("A situação de SLA informada não é válida.");
        }
        return situacao;
    }

    private static <T extends Enum<T>> T valor(Class<T> tipo, String valor, String mensagem) {
        try {
            return Enum.valueOf(tipo, valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException(mensagem);
        }
    }
}
