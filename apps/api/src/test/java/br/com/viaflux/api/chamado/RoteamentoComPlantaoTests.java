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

    private static final int URGENCIA_IMEDIATA = 5;
    private static final int URGENCIA_MEDIA = 3;

    @ParameterizedTest
    @EnumSource(value = TipoChamado.class, names = {"MANUTENCAO", "LOGISTICA", "ASSISTENCIA_24H"})
    void p1EP2OperacionaisComUrgenciaImediataForaDoExpedienteVaoParaOPlantao(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, URGENCIA_IMEDIATA, QUARTA_A_NOITE)).isEqualTo(TipoChamado.ASSISTENCIA_24H);
        assertThat(roteamento.destino(tipo, Prioridade.P2, URGENCIA_IMEDIATA, SABADO_DE_MANHA)).isEqualTo(TipoChamado.ASSISTENCIA_24H);
    }

    @ParameterizedTest
    @EnumSource(TipoChamado.class)
    void emExpedienteOChamadoSegueParaODepartamentoDoTipo(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, URGENCIA_IMEDIATA, QUARTA_EM_EXPEDIENTE)).isEqualTo(tipo);
    }

    @Test
    void p2SemUrgenciaImediataAguardaODepartamento() {
        assertThat(roteamento.destino(TipoChamado.MANUTENCAO, Prioridade.P2, URGENCIA_MEDIA, QUARTA_A_NOITE)).isEqualTo(TipoChamado.MANUTENCAO);
    }

    @ParameterizedTest
    @EnumSource(value = Prioridade.class, names = {"P3", "P4"})
    void p3EP4AguardamOProximoPeriodoUtil(Prioridade prioridade) {
        assertThat(roteamento.destino(TipoChamado.MANUTENCAO, prioridade, URGENCIA_IMEDIATA, QUARTA_A_NOITE)).isEqualTo(TipoChamado.MANUTENCAO);
    }

    @ParameterizedTest
    @EnumSource(value = TipoChamado.class, names = {"TI", "FINANCEIRO", "CONTRATOS"})
    void tiposAdministrativosNaoVaoParaOPlantao(TipoChamado tipo) {
        assertThat(roteamento.destino(tipo, Prioridade.P1, URGENCIA_IMEDIATA, QUARTA_A_NOITE)).isEqualTo(tipo);
    }

    @Test
    void oFechamentoDoExpedienteJaContaComoForaDoHorario() {
        assertThat(roteamento.destino(TipoChamado.LOGISTICA, Prioridade.P1, URGENCIA_IMEDIATA, instante("2026-10-21T18:00")))
                .isEqualTo(TipoChamado.ASSISTENCIA_24H);
        assertThat(roteamento.destino(TipoChamado.LOGISTICA, Prioridade.P1, URGENCIA_IMEDIATA, instante("2026-10-21T08:00")))
                .isEqualTo(TipoChamado.LOGISTICA);
    }
}
