package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.emSaoPaulo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeSla;
import static org.assertj.core.api.Assertions.assertThat;

class PoliticaDeSlaTests {

    private static final Autor PAULA = new Autor(UUID.randomUUID(), "Paula Atendente");

    private final PoliticaDeSla politica = politicaDeSla();

    @Test
    void definePrazosPorPrioridadeComHorasUteisSoParaP3EP4() {
        assertThat(politica.prazosDe(Prioridade.P1)).extracting("primeiraRespostaMinutos", "resolucaoMinutos").containsExactly(15, 120);
        assertThat(politica.prazosDe(Prioridade.P2)).extracting("primeiraRespostaMinutos", "resolucaoMinutos").containsExactly(30, 240);
        assertThat(politica.prazosDe(Prioridade.P3)).extracting("primeiraRespostaMinutos", "resolucaoMinutos").containsExactly(120, 1440);
        assertThat(politica.prazosDe(Prioridade.P4)).extracting("primeiraRespostaMinutos", "resolucaoMinutos").containsExactly(240, 2880);
        assertThat(politica.prazosDe(Prioridade.P1).relogio()).isInstanceOf(RelogioCorrido.class);
        assertThat(politica.prazosDe(Prioridade.P2).relogio()).isInstanceOf(RelogioCorrido.class);
        assertThat(politica.prazosDe(Prioridade.P3).relogio()).isInstanceOf(RelogioDeHorasUteis.class);
        assertThat(politica.prazosDe(Prioridade.P4).relogio()).isInstanceOf(RelogioDeHorasUteis.class);
    }

    @Test
    void chamadoSemTriagemAindaNaoTemSla() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        assertThat(politica.avaliar(chamado, QUARTA_AS_DEZ.plusHours(5).toInstant())).isNull();
    }

    @Test
    void slaDeP1CorreDesdeAAberturaEmTempoCorrido() {
        OffsetDateTime abertura = emSaoPaulo("2026-10-21T17:00");
        Chamado chamado = triado(abertura, 5, 5);

        SlaResponse sla = politica.avaliar(chamado, abertura.plusMinutes(10).toInstant());

        assertThat(sla.primeiraResposta().limite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-21T17:15")));
        assertThat(sla.primeiraResposta().situacao()).isEqualTo(SituacaoPrazo.EM_RISCO);
        assertThat(sla.resolucao().limite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-21T19:00")));
        assertThat(sla.resolucao().situacao()).isEqualTo(SituacaoPrazo.NO_PRAZO);
        assertThat(sla.pausado()).isFalse();
        assertThat(sla.tempoPausadoMinutos()).isZero();
    }

    @Test
    void slaDeP3SoContaHorasUteis() {
        OffsetDateTime abertura = emSaoPaulo("2026-10-21T17:00");
        Chamado chamado = triado(abertura, 3, 3);

        SlaResponse sla = politica.avaliar(chamado, emSaoPaulo("2026-10-21T22:00").toInstant());

        assertThat(sla.primeiraResposta().limite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-22T09:00")));
        assertThat(sla.primeiraResposta().situacao()).isEqualTo(SituacaoPrazo.EM_RISCO);
        assertThat(sla.resolucao().limite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-26T11:00")));
        assertThat(sla.resolucao().situacao()).isEqualTo(SituacaoPrazo.NO_PRAZO);
    }

    @Test
    void primeiraRespostaRegistradaCumpreOPrazo() {
        OffsetDateTime abertura = emSaoPaulo("2026-10-21T17:00");
        Chamado chamado = triado(abertura, 5, 5);
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, abertura.plusMinutes(12));

        SlaResponse sla = politica.avaliar(chamado, abertura.plusMinutes(50).toInstant());

        assertThat(sla.primeiraResposta().situacao()).isEqualTo(SituacaoPrazo.CUMPRIDO);
        assertThat(sla.primeiraResposta().cumpridoEm()).isEqualTo(Datas.local(abertura.plusMinutes(12)));
    }

    @Test
    void resolucaoDepoisDoLimiteEhCumpridaComAtraso() {
        Chamado chamado = triado(QUARTA_AS_DEZ, 5, 5);
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(20));
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(150));

        SlaResponse sla = politica.avaliar(chamado, QUARTA_AS_DEZ.plusHours(6).toInstant());

        assertThat(sla.primeiraResposta().situacao()).isEqualTo(SituacaoPrazo.CUMPRIDO_COM_ATRASO);
        assertThat(sla.resolucao().situacao()).isEqualTo(SituacaoPrazo.CUMPRIDO_COM_ATRASO);
    }

    @Test
    void esperaPeloClientePausaEEstendeOPrazoDeResolucao() {
        Chamado chamado = triado(QUARTA_AS_DEZ, 5, 5);
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(10));
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, QUARTA_AS_DEZ.plusMinutes(30));

        SlaResponse durante = politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(60).toInstant());

        assertThat(durante.pausado()).isTrue();
        assertThat(durante.tempoPausadoMinutos()).isEqualTo(30);
        assertThat(durante.resolucao().limite()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(150)));

        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(90));
        SlaResponse depois = politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(105).toInstant());

        assertThat(depois.pausado()).isFalse();
        assertThat(depois.tempoPausadoMinutos()).isEqualTo(60);
        assertThat(depois.resolucao().limite()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(180)));
        assertThat(depois.resolucao().situacao()).isEqualTo(SituacaoPrazo.NO_PRAZO);
        assertThat(depois.primeiraResposta().limite()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(15)));
    }

    @Test
    void pausaDeP3SoDescontaHorasUteisMasInformaOTempoCorrido() {
        Chamado chamado = triado(QUARTA_AS_DEZ, 3, 3);
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, emSaoPaulo("2026-10-21T17:00"));
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, emSaoPaulo("2026-10-22T09:00"));

        SlaResponse sla = politica.avaliar(chamado, emSaoPaulo("2026-10-22T10:00").toInstant());

        assertThat(sla.tempoPausadoMinutos()).isEqualTo(16 * 60);
        assertThat(sla.resolucao().limite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-23T16:00")));
    }

    @Test
    void overrideDefineOsPrazosUsados() {
        Chamado chamado = triado(QUARTA_AS_DEZ, 1, 1);
        chamado.definirOverride(Prioridade.P1, "Cliente estratégico", PAULA, QUARTA_AS_DEZ.plusMinutes(6));

        SlaResponse sla = politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(20).toInstant());

        assertThat(sla.primeiraResposta().limite()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(15)));
        assertThat(sla.primeiraResposta().situacao()).isEqualTo(SituacaoPrazo.VIOLADO);
    }

    private static Chamado triado(OffsetDateTime abertura, int severidade, int urgencia) {
        Chamado chamado = chamadoAberto("VF-0001", abertura);
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, severidade, urgencia, TipoChamado.MANUTENCAO, PAULA, abertura.plusMinutes(5));
        return chamado;
    }
}
