package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Organizacao;
import br.com.viaflux.api.usuario.TipoOrganizacao;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.organizacao;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeSla;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CalculoDeMetricasTests {

    private static final OffsetDateTime AGORA = QUARTA_AS_DEZ.plusHours(4);
    private static final Autor PAULA = new Autor(UUID.randomUUID(), "Paula Atendente");
    private static final Autor GUINCHO = new Autor(UUID.randomUUID(), "Guincho Rápido");
    private static final FiltrosDeMetricas OUTUBRO = new FiltrosDeMetricas(
            LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), null, null, null, null);

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(AGORA);
    private final CalculoDeMetricas calculo = new CalculoDeMetricas(politicaDeSla());
    private final Organizacao fornecedor = organizacao("Guincho Rápido", TipoOrganizacao.FORNECEDOR);

    @Test
    void semChamadosNoPeriodoNenhumIndicadorTemValor() {
        MetricasResponse metricas = calculo.calcular(List.of(), OUTUBRO);

        assertThat(metricas.totalChamados()).isZero();
        assertThat(metricas.periodo()).isEqualTo(new MetricasResponse.Periodo(OUTUBRO.de(), OUTUBRO.ate()));
        assertThat(metricas.indicadores()).allSatisfy(indicador -> assertThat(indicador.valor()).isNull());
        assertThat(metricas.distribuicaoPorPrioridade()).containsExactly(
                Map.entry(Prioridade.P1, 0L), Map.entry(Prioridade.P2, 0L), Map.entry(Prioridade.P3, 0L), Map.entry(Prioridade.P4, 0L));
    }

    @Test
    void indicadoresQueDependemDeLevantamentoExternoFicamPendentes() {
        MetricasResponse metricas = calculo.calcular(List.of(), OUTUBRO);

        assertThat(metricas.indicadores())
                .filteredOn(MetricasResponse.Indicador::pendenteDeLevantamento)
                .extracting(MetricasResponse.Indicador::chave)
                .containsExactly("csat", "repeticao-informacoes", "adesao-portal");
    }

    @Test
    void calculaOsIndicadoresDoPeriodo() {
        MetricasResponse metricas = calculo.calcular(cenarioDoPeriodo(), OUTUBRO);

        assertThat(metricas.totalChamados()).isEqualTo(4);
        assertThat(valor(metricas, "tmr")).isEqualTo(60.0);
        assertThat(valor(metricas, "tempo-triagem")).isEqualTo(18.0);
        assertThat(valor(metricas, "triagem-no-prazo")).isEqualTo(33.3);
        assertThat(valor(metricas, "aderencia-primeira-resposta")).isEqualTo(50.0);
        assertThat(valor(metricas, "aderencia-resolucao")).isEqualTo(50.0);
        assertThat(valor(metricas, "rastreabilidade")).isEqualTo(50.0);
        assertThat(valor(metricas, "triagem-correta")).isEqualTo(50.0);
        assertThat(valor(metricas, "taxa-reclassificacao")).isEqualTo(50.0);
        assertThat(valor(metricas, "taxa-override")).isEqualTo(50.0);
        assertThat(valor(metricas, "atualizacao-fornecedores")).isEqualTo(100.0);
        assertThat(valor(metricas, "aceite-fornecedores")).isEqualTo(50.0);
    }

    @Test
    void distribuiOsTriadosPelaPrioridadeEfetiva() {
        MetricasResponse metricas = calculo.calcular(cenarioDoPeriodo(), OUTUBRO);

        assertThat(metricas.distribuicaoPorPrioridade()).containsExactly(
                Map.entry(Prioridade.P1, 1L), Map.entry(Prioridade.P2, 0L), Map.entry(Prioridade.P3, 1L), Map.entry(Prioridade.P4, 0L));
    }

    @Test
    void filtrosDeMetricasExigemPeriodoValido() {
        assertThatThrownBy(() -> FiltrosDeMetricas.de("2026-10-31", "2026-10-01", null, null, null, null))
                .isInstanceOf(FiltroChamadoInvalidoException.class);
        assertThatThrownBy(() -> FiltrosDeMetricas.de(null, "2026-10-01", null, null, null, null))
                .isInstanceOf(FiltroChamadoInvalidoException.class);
        assertThatThrownBy(() -> FiltrosDeMetricas.de("2026-10-01", "2026-10-31", null, null, null, "fornecedor"))
                .isInstanceOf(FiltroChamadoInvalidoException.class);
        assertThat(FiltrosDeMetricas.de("2026-10-01", "2026-10-31", "p2", "ti", null, null))
                .isEqualTo(new FiltrosDeMetricas(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), Prioridade.P2, TipoChamado.TI, null, null));
    }

    private List<LinhaDeMetrica> cenarioDoPeriodo() {
        Chamado triadoNoPrazoEResolvido = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        triadoNoPrazoEResolvido.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, PAULA, QUARTA_AS_DEZ.plusMinutes(5));
        triadoNoPrazoEResolvido.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(30));
        triadoNoPrazoEResolvido.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(60));
        ServicoTerceiro aceitoNoPrazo = new ServicoTerceiro(triadoNoPrazoEResolvido, fornecedor, "Reboque", "", "", PAULA, QUARTA_AS_DEZ.plusMinutes(10));
        aceitoNoPrazo.atualizar(StatusServico.RECEBIDO, "", GUINCHO, QUARTA_AS_DEZ.plusMinutes(12));

        Chamado triadoComAtrasoEViolado = chamadoAberto("VF-0002", QUARTA_AS_DEZ);
        triadoComAtrasoEViolado.concluirTriagem(TipoChamado.MANUTENCAO, 5, 5, TipoChamado.MANUTENCAO, PAULA, QUARTA_AS_DEZ.plusMinutes(30));
        triadoComAtrasoEViolado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(40));
        ServicoTerceiro aceitoComAtraso = new ServicoTerceiro(triadoComAtrasoEViolado, fornecedor, "Reboque", "", "", PAULA, QUARTA_AS_DEZ.plusMinutes(40));
        aceitoComAtraso.atualizar(StatusServico.RECEBIDO, "", GUINCHO, QUARTA_AS_DEZ.plusMinutes(60));

        Chamado aguardandoTriagemNoPrazo = chamadoAberto("VF-0003", AGORA.minusMinutes(5));
        Chamado aguardandoTriagemAtrasado = chamadoAberto("VF-0004", QUARTA_AS_DEZ);

        return List.of(
                linha(triadoNoPrazoEResolvido, false, true, aceitoNoPrazo),
                linha(triadoComAtrasoEViolado, true, false, aceitoComAtraso),
                linha(aguardandoTriagemNoPrazo, false, false, null),
                linha(aguardandoTriagemAtrasado, false, false, null)
        );
    }

    private LinhaDeMetrica linha(Chamado chamado, boolean reclassificado, boolean comOverride, ServicoTerceiro servico) {
        return new LinhaDeMetrica(chamado, ambiente.montagem.resumo(chamado), reclassificado, comOverride, Optional.ofNullable(servico));
    }

    private static Double valor(MetricasResponse metricas, String chave) {
        return metricas.indicadores().stream()
                .filter(indicador -> indicador.chave().equals(chave))
                .findFirst()
                .orElseThrow()
                .valor();
    }
}
