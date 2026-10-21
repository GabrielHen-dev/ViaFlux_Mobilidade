package br.com.viaflux.api.chamado;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record MetricasResponse(
        Periodo periodo,
        long totalChamados,
        List<Indicador> indicadores,
        Map<Prioridade, Long> distribuicaoPorPrioridade
) {

    public record Periodo(LocalDate de, LocalDate ate) {
    }

    public record Indicador(String chave, String rotulo, Double valor, String unidade, boolean pendenteDeLevantamento, String observacao) {

        static Indicador medido(String chave, String rotulo, Double valor, String unidade, String observacao) {
            return new Indicador(chave, rotulo, valor, unidade, false, observacao);
        }

        static Indicador pendente(String chave, String rotulo, String observacao) {
            return new Indicador(chave, rotulo, null, "percentual", true, observacao);
        }
    }
}
