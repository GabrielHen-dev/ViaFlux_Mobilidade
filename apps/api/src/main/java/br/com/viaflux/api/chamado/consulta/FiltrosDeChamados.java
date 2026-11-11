package br.com.viaflux.api.chamado.consulta;


import br.com.viaflux.api.chamado.FiltroChamadoInvalidoException;
import br.com.viaflux.api.chamado.Prioridade;
import br.com.viaflux.api.chamado.StatusChamado;
import br.com.viaflux.api.chamado.TipoChamado;
import br.com.viaflux.api.chamado.sla.SituacaoPrazo;

import java.util.Locale;

public record FiltrosDeChamados(
        String busca,
        StatusChamado status,
        Prioridade prioridade,
        TipoChamado departamento,
        TipoChamado tipo,
        SituacaoPrazo sla,
        Etapa etapa,
        Ordenacao ordenacao,
        boolean apenasMeus
) {

    public enum Etapa { TRIAGEM, ATENDIMENTO }

    public enum Ordenacao { FILA, RECENTES, ATIVOS_RECENTES }

    static final String RESPONSAVEL_EU = "eu";

    public FiltrosDeChamados(String busca, StatusChamado status, Prioridade prioridade, TipoChamado departamento,
                             TipoChamado tipo, SituacaoPrazo sla, Etapa etapa, Ordenacao ordenacao) {
        this(busca, status, prioridade, departamento, tipo, sla, etapa, ordenacao, false);
    }

    public FiltrosDeChamados(String busca, StatusChamado status, Prioridade prioridade, TipoChamado departamento,
                             SituacaoPrazo sla, Etapa etapa, Ordenacao ordenacao) {
        this(busca, status, prioridade, departamento, null, sla, etapa, ordenacao, false);
    }

    public static FiltrosDeChamados de(String busca, String status, String prioridade, String departamento, String sla, String etapa, String ordenacao) {
        return de(busca, status, prioridade, departamento, null, sla, etapa, ordenacao);
    }

    public static FiltrosDeChamados de(String busca, String status, String prioridade, String departamento, String tipo, String sla, String etapa, String ordenacao) {
        return de(busca, status, prioridade, departamento, tipo, sla, etapa, ordenacao, null);
    }

    public static FiltrosDeChamados de(String busca, String status, String prioridade, String departamento, String tipo, String sla, String etapa,
                                       String ordenacao, String responsavel) {
        return new FiltrosDeChamados(
                busca,
                vazio(status) ? null : StatusChamado.fromRotulo(status),
                vazio(prioridade) ? null : Prioridade.deCodigo(prioridade),
                vazio(departamento) ? null : departamentoValido(departamento),
                vazio(tipo) ? null : tipoValido(tipo),
                vazio(sla) ? null : situacaoFiltravel(sla),
                vazio(etapa) ? null : valor(Etapa.class, etapa, "A etapa informada não é válida."),
                vazio(ordenacao) ? Ordenacao.FILA : valor(Ordenacao.class, ordenacao, "A ordenação informada não é válida."),
                apenasMeus(responsavel)
        );
    }

    private static boolean apenasMeus(String responsavel) {
        if (vazio(responsavel)) {
            return false;
        }
        if (!RESPONSAVEL_EU.equalsIgnoreCase(responsavel.trim())) {
            throw new FiltroChamadoInvalidoException("O responsável informado não é válido. Use responsavel=eu.");
        }
        return true;
    }

    public FiltrosDeChamados semStatus() {
        return new FiltrosDeChamados(busca, null, prioridade, departamento, tipo, sla, etapa, ordenacao, apenasMeus);
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
