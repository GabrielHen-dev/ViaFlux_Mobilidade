package br.com.viaflux.api.chamado.sla;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class RelogioDeHorasUteisTests {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");

    private final RelogioDeHorasUteis expediente = new RelogioDeHorasUteis(SAO_PAULO, LocalTime.of(8, 0), LocalTime.of(18, 0));

    @ParameterizedTest
    @CsvSource({
            "2026-10-21T08:00, true",
            "2026-10-21T10:00, true",
            "2026-10-21T17:59, true",
            "2026-10-21T18:00, false",
            "2026-10-21T07:59, false",
            "2026-10-21T23:00, false",
            "2026-10-24T10:00, false",
            "2026-10-25T10:00, false"
    })
    void reconheceOExpedienteDeSegundaASextaDasOitoAsDezoito(String dataHora, boolean esperado) {
        assertThat(expediente.emExpediente(local(dataHora))).isEqualTo(esperado);
    }

    @Test
    void contaMinutosDentroDoMesmoExpediente() {
        assertThat(expediente.minutosEntre(local("2026-10-21T10:00"), local("2026-10-21T11:30"))).isEqualTo(90);
    }

    @Test
    void ignoraANoiteEntreDoisExpedientes() {
        assertThat(expediente.minutosEntre(local("2026-10-21T17:00"), local("2026-10-22T09:00"))).isEqualTo(120);
    }

    @Test
    void ignoraOFimDeSemana() {
        assertThat(expediente.minutosEntre(local("2026-10-23T17:00"), local("2026-10-26T09:00"))).isEqualTo(120);
    }

    @Test
    void naoContaNadaForaDoExpedienteNemIntervaloInvertido() {
        assertThat(expediente.minutosEntre(local("2026-10-24T09:00"), local("2026-10-25T20:00"))).isZero();
        assertThat(expediente.minutosEntre(local("2026-10-21T19:00"), local("2026-10-21T23:00"))).isZero();
        assertThat(expediente.minutosEntre(local("2026-10-21T11:00"), local("2026-10-21T10:00"))).isZero();
    }

    @Test
    void somaMinutosDentroDoMesmoExpediente() {
        assertThat(expediente.somarMinutos(local("2026-10-21T10:00"), 60)).isEqualTo(local("2026-10-21T11:00"));
    }

    @Test
    void somaQueUltrapassaOFechamentoContinuaNoProximoDiaUtil() {
        assertThat(expediente.somarMinutos(local("2026-10-21T17:00"), 120)).isEqualTo(local("2026-10-22T09:00"));
    }

    @Test
    void somaQueUltrapassaASextaContinuaNaSegunda() {
        assertThat(expediente.somarMinutos(local("2026-10-23T17:30"), 60)).isEqualTo(local("2026-10-26T08:30"));
    }

    @Test
    void inicioForaDoExpedienteComecaAContarNaProximaAbertura() {
        assertThat(expediente.somarMinutos(local("2026-10-21T06:00"), 30)).isEqualTo(local("2026-10-21T08:30"));
        assertThat(expediente.somarMinutos(local("2026-10-21T19:00"), 30)).isEqualTo(local("2026-10-22T08:30"));
        assertThat(expediente.somarMinutos(local("2026-10-24T12:00"), 30)).isEqualTo(local("2026-10-26T08:30"));
    }

    @Test
    void prazoDeVinteEQuatroHorasUteisAtravessaVariosExpedientes() {
        assertThat(expediente.somarMinutos(local("2026-10-21T10:00"), 24 * 60)).isEqualTo(local("2026-10-23T14:00"));
    }

    @Test
    void somarEContarSaoOperacoesInversas() {
        Instant inicio = local("2026-10-22T16:45");
        Instant limite = expediente.somarMinutos(inicio, 48 * 60);

        assertThat(expediente.minutosEntre(inicio, limite)).isCloseTo(48 * 60, within(0.001));
    }

    @Test
    void relogioCorridoContaTodasAsHoras() {
        RelogioCorrido corrido = new RelogioCorrido();

        assertThat(corrido.minutosEntre(local("2026-10-23T17:00"), local("2026-10-26T09:00"))).isEqualTo(64 * 60);
        assertThat(corrido.minutosEntre(local("2026-10-21T11:00"), local("2026-10-21T10:00"))).isZero();
        assertThat(corrido.somarMinutos(local("2026-10-23T23:50"), 15)).isEqualTo(local("2026-10-24T00:05"));
    }

    private static Instant local(String dataHora) {
        return LocalDateTime.parse(dataHora).atZone(SAO_PAULO).toInstant();
    }
}
