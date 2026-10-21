package br.com.viaflux.api.chamado.sla;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AvaliacaoDePrazoTests {

    private static final Instant INICIO = Instant.parse("2026-10-21T13:00:00Z");

    private final RelogioCorrido relogio = new RelogioCorrido();

    @ParameterizedTest
    @CsvSource({
            "0, NO_PRAZO",
            "29, NO_PRAZO",
            "30, EM_RISCO",
            "59, EM_RISCO",
            "60, VIOLADO",
            "90, VIOLADO"
    })
    void situacaoEmAbertoDependeDaFracaoConsumida(long minutosDecorridos, SituacaoPrazo esperada) {
        AvaliacaoDePrazo avaliacao = AvaliacaoDePrazo.avaliar(relogio, INICIO, 60, 0, null, INICIO.plusSeconds(minutosDecorridos * 60));

        assertThat(avaliacao.situacao()).isEqualTo(esperada);
        assertThat(avaliacao.limite()).isEqualTo(INICIO.plusSeconds(3600));
        assertThat(avaliacao.cumpridoEm()).isNull();
    }

    @Test
    void prazoCumpridoAteOLimiteOuDepoisDele() {
        Instant limite = INICIO.plusSeconds(3600);

        assertThat(AvaliacaoDePrazo.avaliar(relogio, INICIO, 60, 0, limite, limite.plusSeconds(600)).situacao())
                .isEqualTo(SituacaoPrazo.CUMPRIDO);
        assertThat(AvaliacaoDePrazo.avaliar(relogio, INICIO, 60, 0, limite.plusSeconds(1), limite).situacao())
                .isEqualTo(SituacaoPrazo.CUMPRIDO_COM_ATRASO);
    }

    @Test
    void minutosPausadosEmpurramOLimiteEDescontamDoConsumo() {
        AvaliacaoDePrazo avaliacao = AvaliacaoDePrazo.avaliar(relogio, INICIO, 60, 30, null, INICIO.plusSeconds(70 * 60));

        assertThat(avaliacao.limite()).isEqualTo(INICIO.plusSeconds(90 * 60));
        assertThat(avaliacao.situacao()).isEqualTo(SituacaoPrazo.EM_RISCO);
    }

    @Test
    void somaPausasEncerradasEAPausaEmAndamentoAteOInstanteInformado() {
        List<Pausa> pausas = List.of(
                new Pausa(INICIO, INICIO.plusSeconds(10 * 60)),
                new Pausa(INICIO.plusSeconds(30 * 60), null)
        );

        assertThat(AvaliacaoDePrazo.minutosPausados(relogio, pausas, INICIO.plusSeconds(45 * 60))).isEqualTo(25);
    }

    @Test
    void somenteSituacoesNaoCumpridasEstaoEmAberto() {
        assertThat(SituacaoPrazo.NO_PRAZO.emAberto()).isTrue();
        assertThat(SituacaoPrazo.EM_RISCO.emAberto()).isTrue();
        assertThat(SituacaoPrazo.VIOLADO.emAberto()).isTrue();
        assertThat(SituacaoPrazo.CUMPRIDO.emAberto()).isFalse();
        assertThat(SituacaoPrazo.CUMPRIDO_COM_ATRASO.emAberto()).isFalse();
    }
}
