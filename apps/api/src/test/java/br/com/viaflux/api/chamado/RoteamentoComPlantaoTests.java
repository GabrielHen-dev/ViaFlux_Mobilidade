package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.EXPEDIENTE;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.instante;
import static org.assertj.core.api.Assertions.assertThat;

class RoteamentoComPlantaoTests {

    private static final Instant QUARTA_EM_EXPEDIENTE = instante("2026-10-21T10:00");
    private static final Instant QUARTA_A_NOITE = instante("2026-10-21T22:00");
    private static final Instant SABADO_DE_MANHA = instante("2026-10-24T10:00");

    private final RegraDeRoteamento roteamento = new RoteamentoComPlantao(EXPEDIENTE);

    @ParameterizedTest
    @EnumSource(value = TipoChamado.class, names = {"MANUTENCAO", "LOGISTICA", "ASSISTENCIA_24H"})
    void p1OperacionalForaDoExpedienteVaiParaOPlantaoDaAssistencia(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, QUARTA_A_NOITE)).isEqualTo(TipoChamado.ASSISTENCIA_24H);
        assertThat(roteamento.destino(tipo, Prioridade.P1, SABADO_DE_MANHA)).isEqualTo(TipoChamado.ASSISTENCIA_24H);
    }

    @ParameterizedTest
    @EnumSource(TipoChamado.class)
    void emExpedienteOChamadoSegueParaODepartamentoDoTipo(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, QUARTA_EM_EXPEDIENTE)).isEqualTo(tipo);
    }

    @ParameterizedTest
    @EnumSource(value = Prioridade.class, names = {"P2", "P3", "P4"})
    void somenteP1VaiParaOPlantao(Prioridade prioridade) {
        assertThat(roteamento.destino(TipoChamado.MANUTENCAO, prioridade, QUARTA_A_NOITE)).isEqualTo(TipoChamado.MANUTENCAO);
    }

    @ParameterizedTest
    @EnumSource(value = TipoChamado.class, names = {"TI", "FINANCEIRO", "CONTRATOS"})
    void tiposAdministrativosNaoVaoParaOPlantao(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, QUARTA_A_NOITE)).isEqualTo(tipo);
    }

    @Test
    void oFechamentoDoExpedienteJaContaComoForaDoHorario() {
        assertThat(roteamento.destino(TipoChamado.LOGISTICA, Prioridade.P1, instante("2026-10-21T18:00"))).isEqualTo(TipoChamado.ASSISTENCIA_24H);
        assertThat(roteamento.destino(TipoChamado.LOGISTICA, Prioridade.P1, instante("2026-10-21T08:00"))).isEqualTo(TipoChamado.LOGISTICA);
    }
}
