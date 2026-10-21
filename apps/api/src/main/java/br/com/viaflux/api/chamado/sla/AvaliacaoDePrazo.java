package br.com.viaflux.api.chamado.sla;

import java.time.Instant;
import java.util.Collection;

public record AvaliacaoDePrazo(Instant limite, Instant cumpridoEm, SituacaoPrazo situacao) {

    public static final double PERCENTUAL_EM_RISCO = 0.5;

    public static AvaliacaoDePrazo avaliar(
            Relogio relogio,
            Instant inicio,
            double duracaoMinutos,
            double minutosPausados,
            Instant cumpridoEm,
            Instant agora
    ) {
        Instant limite = relogio.somarMinutos(inicio, duracaoMinutos + minutosPausados);
        if (cumpridoEm != null) {
            SituacaoPrazo situacao = cumpridoEm.isAfter(limite) ? SituacaoPrazo.CUMPRIDO_COM_ATRASO : SituacaoPrazo.CUMPRIDO;
            return new AvaliacaoDePrazo(limite, cumpridoEm, situacao);
        }
        double consumido = (relogio.minutosEntre(inicio, agora) - minutosPausados) / duracaoMinutos;
        SituacaoPrazo situacao = consumido >= 1
                ? SituacaoPrazo.VIOLADO
                : consumido >= PERCENTUAL_EM_RISCO ? SituacaoPrazo.EM_RISCO : SituacaoPrazo.NO_PRAZO;
        return new AvaliacaoDePrazo(limite, null, situacao);
    }

    public static double minutosPausados(Relogio relogio, Collection<Pausa> pausas, Instant ate) {
        return pausas.stream()
                .mapToDouble(pausa -> relogio.minutosEntre(pausa.inicio(), pausa.emAndamento() ? ate : pausa.fim()))
                .sum();
    }
}
