package br.com.viaflux.api.devtools;

import br.com.viaflux.api.chamado.sla.Relogio;
import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class PopuladorDeDadosTests {

    private static final ZoneId FORTALEZA = ZoneId.of("America/Fortaleza");
    private static final OffsetDateTime QUARTA_AS_DEZ = LocalDateTime.parse("2026-10-28T10:00").atZone(FORTALEZA).toOffsetDateTime();

    private final RelogioDeHorasUteis expediente = new RelogioDeHorasUteis(FORTALEZA, LocalTime.of(8, 0), LocalTime.of(18, 0));

    @RepeatedTest(20)
    void triagemNasceFaltandoMinutosParaVencer() {
        assertThat(minutosAteVencer(new RelogioCorrido(), QUARTA_AS_DEZ, 10)).isBetween(2.9, 9.1);
    }

    @RepeatedTest(20)
    void slaEmTempoCorridoNasceFaltandoMinutosParaVencer() {
        assertThat(minutosAteVencer(new RelogioCorrido(), QUARTA_AS_DEZ, 2 * 60)).isBetween(2.9, 12.1);
    }

    @RepeatedTest(20)
    void slaEmHorasUteisNasceFaltandoMinutosParaVencer() {
        assertThat(minutosAteVencer(expediente, QUARTA_AS_DEZ, 48 * 60)).isBetween(2.9, 12.1);
    }

    @Test
    void foraDoExpedienteOPrazoVenceMinutosDepoisDaAberturaSeguinte() {
        OffsetDateTime quartaAsVinte = LocalDateTime.parse("2026-10-28T20:00").atZone(FORTALEZA).toOffsetDateTime();
        OffsetDateTime abertura = PopuladorDeDados.aberturaQueVenceEmMinutos(expediente, quartaAsVinte, 24 * 60);

        OffsetDateTime limite = expediente.somarMinutos(abertura.toInstant(), 24 * 60).atZone(FORTALEZA).toOffsetDateTime();

        assertThat(limite.toLocalDate()).isEqualTo(quartaAsVinte.toLocalDate().plusDays(1));
        assertThat(limite.atZoneSameInstant(FORTALEZA).toLocalTime()).isBetween(LocalTime.of(8, 2), LocalTime.of(8, 13));
    }

    private static double minutosAteVencer(Relogio relogio, OffsetDateTime agora, int prazoEmMinutos) {
        OffsetDateTime abertura = PopuladorDeDados.aberturaQueVenceEmMinutos(relogio, agora, prazoEmMinutos);
        return Duration.between(agora.toInstant(), relogio.somarMinutos(abertura.toInstant(), prazoEmMinutos)).toMillis() / 60_000d;
    }
}
