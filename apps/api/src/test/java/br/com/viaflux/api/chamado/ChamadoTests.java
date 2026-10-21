package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static org.assertj.core.api.Assertions.assertThat;

class ChamadoTests {

    private static final Autor PAULA = new Autor(UUID.randomUUID(), "Paula Atendente");
    private static final Autor RUI = new Autor(UUID.randomUUID(), "Rui Atendente");

    @Test
    void abreSemClassificacaoComPrazoDeTriagemPelaUrgenciaDeclarada() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 5);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(chamado.triado()).isFalse();
        assertThat(chamado.prioridadeEfetiva()).isNull();
        assertThat(chamado.score()).isNull();
        assertThat(chamado.getDepartamento()).isNull();
        assertThat(chamado.tipoVigente()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(chamado.getUrgenciaDeclarada()).isEqualTo(5);
        assertThat(chamado.getTriagemPrazoMinutos()).isEqualTo(10);
        assertThat(chamado.getTriagemLimite()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(10));
        assertThat(chamado.getPlaca()).isEqualTo("ABC-1D23");
        assertThat(chamado.getTelefone()).isEmpty();
        assertThat(chamado.getLocalizacao().getEndereco()).isEqualTo("BR-116, km 312");
    }

    @Test
    void assumirTriagemColocaEmTriagemComResponsavel() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        chamado.iniciarTriagem(PAULA, QUARTA_AS_DEZ.plusMinutes(2));

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.EM_TRIAGEM);
        assertThat(chamado.getTriagemIniciadaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(2));
        assertThat(chamado.getTriagemResponsavel()).isEqualTo(PAULA);
        assertThat(chamado.getAtualizadoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(2));
    }

    @Test
    void outroAtendenteAssumeATriagemSemPerderOInicioOriginal() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        chamado.iniciarTriagem(PAULA, QUARTA_AS_DEZ.plusMinutes(2));

        chamado.iniciarTriagem(RUI, QUARTA_AS_DEZ.plusMinutes(4));

        assertThat(chamado.getTriagemIniciadaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(2));
        assertThat(chamado.getTriagemResponsavel()).isEqualTo(RUI);
    }

    @Test
    void concluirTriagemClassificaEColocaNaFilaDoDepartamento() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        chamado.iniciarTriagem(PAULA, QUARTA_AS_DEZ.plusMinutes(1));

        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 5, 3, TipoChamado.LOGISTICA, RUI, QUARTA_AS_DEZ.plusMinutes(6));

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
        assertThat(chamado.triado()).isTrue();
        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.LOGISTICA);
        assertThat(chamado.getClassificacaoTipo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(chamado.score()).isEqualTo(8);
        assertThat(chamado.prioridadeCalculada()).isEqualTo(Prioridade.P2);
        assertThat(chamado.getTriadoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(6));
        assertThat(chamado.getTriadoPor()).isEqualTo(RUI);
        assertThat(chamado.getTriagemResponsavel()).isEqualTo(RUI);
        assertThat(chamado.getTriagemIniciadaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(1));
    }

    @Test
    void concluirTriagemSemAssumirAntesRegistraOInicioNaConclusao() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        chamado.concluirTriagem(TipoChamado.TI, 1, 1, TipoChamado.TI, PAULA, QUARTA_AS_DEZ.plusMinutes(3));

        assertThat(chamado.getTriagemIniciadaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(3));
        assertThat(chamado.tipoVigente()).isEqualTo(TipoChamado.TI);
    }

    @ParameterizedTest
    @CsvSource({
            "5, 5, P1",
            "5, 3, P2",
            "3, 5, P2",
            "3, 3, P3",
            "5, 1, P3",
            "1, 5, P3",
            "3, 1, P4",
            "1, 1, P4"
    })
    void prioridadeSaiDoScoreDeSeveridadeMaisUrgencia(int severidade, int urgencia, Prioridade esperada) {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        chamado.concluirTriagem(TipoChamado.MANUTENCAO, severidade, urgencia, TipoChamado.MANUTENCAO, PAULA, QUARTA_AS_DEZ.plusMinutes(5));

        assertThat(chamado.prioridadeEfetiva()).isEqualTo(esperada);
    }

    @Test
    void naoConcluiNemAssumeTriagemJaConcluida() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(erroAo(() -> chamado.concluirTriagem(TipoChamado.TI, 1, 1, TipoChamado.TI, PAULA, QUARTA_AS_DEZ.plusMinutes(9)))
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> chamado.iniciarTriagem(PAULA, QUARTA_AS_DEZ.plusMinutes(9))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
    }

    @Test
    void antesDaTriagemNaoAceitaAcoesDeAtendimento() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        OffsetDateTime agora = QUARTA_AS_DEZ.plusMinutes(1);

        assertThat(erroAo(() -> chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, agora)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> chamado.transferir(TipoChamado.TI, agora)).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> chamado.reclassificar(TipoChamado.TI, 3, 3, agora)).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> chamado.definirOverride(Prioridade.P1, "Cliente estratégico", PAULA, agora)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(chamado::exigirTriagemConcluida).getBody().getDetail())
                .isEqualTo("Conclua a triagem do chamado antes desta ação.");
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.ABERTO);
    }

    @ParameterizedTest
    @EnumSource(value = StatusChamado.class, names = {"ABERTO", "EM_TRIAGEM"})
    void statusDeTriagemNaoPodemSerDefinidosManualmente(StatusChamado status) {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        ErroDeChamado erro = erroAo(() -> chamado.alterarStatus(status, null, QUARTA_AS_DEZ.plusMinutes(10)));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errosDeCampo(erro)).containsKey("status");
    }

    @Test
    void aguardandoExigeMotivo() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        ErroDeChamado erro = erroAo(() -> chamado.alterarStatus(StatusChamado.AGUARDANDO, null, QUARTA_AS_DEZ.plusMinutes(10)));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errosDeCampo(erro)).containsKey("motivoAguardando");
    }

    @Test
    void recusaStatusIgualAoAtual() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(erroAo(() -> chamado.alterarStatus(StatusChamado.NA_FILA, null, QUARTA_AS_DEZ.plusMinutes(10))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void trocarOMotivoDaEsperaNaoEhStatusRepetido() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, QUARTA_AS_DEZ.plusMinutes(10));

        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, QUARTA_AS_DEZ.plusMinutes(20));

        assertThat(chamado.getMotivoAguardando()).isEqualTo(MotivoAguardando.CLIENTE);
        assertThat(chamado.getPausas()).hasSize(1);
    }

    @Test
    void soFechaDepoisDeResolvido() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(erroAo(() -> chamado.alterarStatus(StatusChamado.FECHADO, null, QUARTA_AS_DEZ.plusMinutes(20))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(30));
        StatusChamado anterior = chamado.alterarStatus(StatusChamado.FECHADO, null, QUARTA_AS_DEZ.plusMinutes(40));

        assertThat(anterior).isEqualTo(StatusChamado.RESOLVIDO);
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.FECHADO);
        assertThat(chamado.getResolvidoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(30));
    }

    @Test
    void reabrirUmChamadoResolvidoLimpaAResolucao() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(30));

        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(40));

        assertThat(chamado.getResolvidoEm()).isNull();
    }

    @Test
    void primeiraRespostaEhRegistradaUmaUnicaVezAoEntrarEmAtendimento() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(10));
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, QUARTA_AS_DEZ.plusMinutes(20));
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(30));

        assertThat(chamado.getPrimeiraRespostaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(10));
    }

    @Test
    void assumirOAtendimentoRegistraOResponsavel() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        Autor marina = new Autor(UUID.randomUUID(), "Marina");

        chamado.assumirAtendimento(marina, QUARTA_AS_DEZ.plusMinutes(8));

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.EM_ATENDIMENTO);
        assertThat(chamado.getAtendimentoResponsavel()).isEqualTo(marina);
        assertThat(chamado.getAtendimentoAssumidoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(8));
        assertThat(chamado.getPrimeiraRespostaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(8));
    }

    @Test
    void outraPessoaDaFilaAssumeNoLugarMasNinguemAssumeDeNovoOQueJaEhSeu() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        Autor marina = new Autor(UUID.randomUUID(), "Marina");
        Autor joao = new Autor(UUID.randomUUID(), "João");
        chamado.assumirAtendimento(marina, QUARTA_AS_DEZ.plusMinutes(8));

        assertThat(erroAo(() -> chamado.assumirAtendimento(marina, QUARTA_AS_DEZ.plusMinutes(9))).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        chamado.assumirAtendimento(joao, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(chamado.getAtendimentoResponsavel()).isEqualTo(joao);
        assertThat(chamado.getPrimeiraRespostaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(8));
    }

    @Test
    void transferirOuDevolverParaAFilaLiberaOResponsavel() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.assumirAtendimento(new Autor(UUID.randomUUID(), "Marina"), QUARTA_AS_DEZ.plusMinutes(8));
        chamado.transferir(TipoChamado.TI, QUARTA_AS_DEZ.plusMinutes(9));

        assertThat(chamado.getAtendimentoResponsavel()).isNull();

        chamado.assumirAtendimento(new Autor(UUID.randomUUID(), "Tiago"), QUARTA_AS_DEZ.plusMinutes(10));
        chamado.alterarStatus(StatusChamado.NA_FILA, null, QUARTA_AS_DEZ.plusMinutes(11));

        assertThat(chamado.getAtendimentoResponsavel()).isNull();
    }

    @Test
    void naoAssumeChamadoSemTriagemOuJaResolvido() {
        Chamado aberto = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        Chamado resolvido = chamadoTriado("VF-0002", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        resolvido.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(20));
        Autor marina = new Autor(UUID.randomUUID(), "Marina");

        assertThat(erroAo(() -> aberto.assumirAtendimento(marina, QUARTA_AS_DEZ.plusMinutes(5))).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> resolvido.assumirAtendimento(marina, QUARTA_AS_DEZ.plusMinutes(25))).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void resolverDiretoDaFilaContaComoPrimeiraResposta() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5);

        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(12));

        assertThat(chamado.getPrimeiraRespostaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(12));
    }

    @Test
    void primeiraRespostaNaoEhRegistradaAntesDaTriagem() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        chamado.registrarPrimeiraResposta(QUARTA_AS_DEZ.plusMinutes(1));

        assertThat(chamado.getPrimeiraRespostaEm()).isNull();
    }

    @Test
    void aguardarOClientePausaAteOChamadoSairDaEspera() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(chamado.getPausas()).singleElement().satisfies(pausa -> assertThat(pausa.emAndamento()).isTrue());

        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(40));

        assertThat(chamado.getMotivoAguardando()).isNull();
        assertThat(chamado.getPausas()).singleElement().satisfies(pausa -> {
            assertThat(pausa.emAndamento()).isFalse();
            assertThat(pausa.paraPausa().fim()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(40).toInstant());
        });
    }

    @Test
    void aguardarFornecedorNaoPausaOPrazo() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(chamado.getMotivoAguardando()).isEqualTo(MotivoAguardando.FORNECEDOR);
        assertThat(chamado.getPausas()).isEmpty();
    }

    @Test
    void transferenciaDevolveParaAFilaDoNovoDepartamentoEEncerraAPausa() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, QUARTA_AS_DEZ.plusMinutes(10));

        TipoChamado origem = chamado.transferir(TipoChamado.LOGISTICA, QUARTA_AS_DEZ.plusMinutes(20));

        assertThat(origem).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.LOGISTICA);
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
        assertThat(chamado.getMotivoAguardando()).isNull();
        assertThat(chamado.getPausas()).singleElement().satisfies(pausa -> assertThat(pausa.emAndamento()).isFalse());
    }

    @Test
    void transferirUmChamadoResolvidoMantemOStatus() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(10));

        chamado.transferir(TipoChamado.FINANCEIRO, QUARTA_AS_DEZ.plusMinutes(20));

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.RESOLVIDO);
    }

    @Test
    void naoTransfereParaOMesmoDepartamentoNemChamadoFechado() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(erroAo(() -> chamado.transferir(TipoChamado.MANUTENCAO, QUARTA_AS_DEZ.plusMinutes(10))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(20));
        chamado.alterarStatus(StatusChamado.FECHADO, null, QUARTA_AS_DEZ.plusMinutes(30));

        assertThat(erroAo(() -> chamado.transferir(TipoChamado.TI, QUARTA_AS_DEZ.plusMinutes(40))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void reclassificarRecalculaAPrioridade() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        chamado.reclassificar(TipoChamado.MANUTENCAO, 5, 5, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(chamado.prioridadeEfetiva()).isEqualTo(Prioridade.P1);
        assertThat(chamado.score()).isEqualTo(10);
    }

    @Test
    void recusaReclassificacaoIgualAVigente() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(erroAo(() -> chamado.reclassificar(TipoChamado.MANUTENCAO, 3, 3, QUARTA_AS_DEZ.plusMinutes(10))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void overrideSobrepoeAPrioridadeCalculadaAteSerRemovido() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 1, 1);

        chamado.definirOverride(Prioridade.P1, "Cliente estratégico", PAULA, QUARTA_AS_DEZ.plusMinutes(10));

        assertThat(chamado.prioridadeEfetiva()).isEqualTo(Prioridade.P1);
        assertThat(chamado.prioridadeCalculada()).isEqualTo(Prioridade.P4);
        assertThat(chamado.getOverrideAutor()).isEqualTo(PAULA);
        assertThat(chamado.getOverrideDefinidoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(10));

        Prioridade removida = chamado.removerOverride(QUARTA_AS_DEZ.plusMinutes(20));

        assertThat(removida).isEqualTo(Prioridade.P1);
        assertThat(chamado.prioridadeEfetiva()).isEqualTo(Prioridade.P4);
        assertThat(chamado.getOverrideAutor()).isNull();
        assertThat(chamado.getOverrideJustificativa()).isNull();
    }

    @Test
    void recusaOverrideIgualAPrioridadeEfetivaERemocaoSemOverride() {
        Chamado chamado = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(erroAo(() -> chamado.definirOverride(Prioridade.P3, "Mesma prioridade", PAULA, QUARTA_AS_DEZ.plusMinutes(10)))
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(erroAo(() -> chamado.removerOverride(QUARTA_AS_DEZ.plusMinutes(10))).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void lixeiraMarcaERestauraOChamado() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);

        chamado.moverParaLixeira(QUARTA_AS_DEZ.plusMinutes(5));

        assertThat(chamado.naLixeira()).isTrue();
        assertThat(chamado.getExcluidoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(5));

        chamado.restaurar();

        assertThat(chamado.naLixeira()).isFalse();
    }

    @Test
    void atualizacaoNuncaVoltaNoTempo() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        chamado.tocar(QUARTA_AS_DEZ.plusMinutes(10));

        chamado.tocar(QUARTA_AS_DEZ.plusMinutes(5));

        assertThat(chamado.getAtualizadoEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(10));
    }

    @Test
    void pertenceSomenteAoSolicitanteVinculado() {
        UUID solicitanteId = UUID.randomUUID();
        Chamado doCliente = chamadoAberto("VF-0001", QUARTA_AS_DEZ,
                ChamadosDeTeste.usuario(solicitanteId, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3);
        Chamado semSolicitante = chamadoAberto("VF-0002", QUARTA_AS_DEZ);

        assertThat(doCliente.pertenceAo(solicitanteId)).isTrue();
        assertThat(doCliente.pertenceAo(UUID.randomUUID())).isFalse();
        assertThat(semSolicitante.pertenceAo(solicitanteId)).isFalse();
    }
}
