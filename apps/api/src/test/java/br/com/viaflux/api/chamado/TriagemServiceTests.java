package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.EXPEDIENTE;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.autor;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.emSaoPaulo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TriagemServiceTests {

    private static final UUID ANA = UUID.randomUUID();

    private final UsuarioAtual paula = atendente();

    @Test
    void assumirTriagemRegistraOResponsavelParaTodos() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(2));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        ChamadoResponse resposta = servico(ambiente).iniciar("VF-0001", paula);

        assertThat(resposta.status()).isEqualTo("Em triagem");
        assertThat(resposta.triagem().responsavel()).isEqualTo(autor(paula));
        assertThat(resposta.triagem().iniciadaEm()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(2)));
        ChamadoEvento evento = ambiente.unicoEventoDoTipo(TipoEvento.TRIAGEM);
        assertThat(evento.getAcao()).isEqualTo("Análise iniciada");
        assertThat(evento.getDetalhe()).isEqualTo("Análise assumida por Paula Atendente.");
        assertThat(evento.isVisivelCliente()).isTrue();
    }

    @Test
    void assumirTriagemDeOutroAtendenteRegistraQuemEstavaAntes() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(4));
        Chamado chamado = ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));
        chamado.iniciarTriagem(new Autor(UUID.randomUUID(), "Rui Atendente"), QUARTA_AS_DEZ.plusMinutes(1));

        servico(ambiente).iniciar("VF-0001", paula);

        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.TRIAGEM).getDetalhe())
                .isEqualTo("Análise assumida por Paula Atendente (antes com Rui Atendente).");
    }

    @Test
    void concluirTriagemClassificaEncaminhaPeloRoteamentoEAvisaOCliente() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(6));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(ANA, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 5));

        ChamadoResponse resposta = servico(ambiente).concluir("VF-0001",
                new ConcluirTriagemRequest("MANUTENCAO", 5, 3, "Cliente parado na estrada"), paula);

        assertThat(resposta.status()).isEqualTo("Na fila");
        assertThat(resposta.prioridade()).isEqualTo(Prioridade.P2);
        assertThat(resposta.score()).isEqualTo(8);
        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(resposta.classificacao()).isEqualTo(new ClassificacaoResponse(TipoChamado.MANUTENCAO, 5, 3, 8, Prioridade.P2));
        assertThat(resposta.sla()).isNotNull();
        assertThat(resposta.triagem().concluidaPor()).isEqualTo(autor(paula));

        ChamadoEvento classificacao = ambiente.unicoEventoDoTipo(TipoEvento.CLASSIFICACAO);
        assertThat(classificacao.isVisivelCliente()).isFalse();
        assertThat(classificacao.getDetalhe())
                .startsWith("Manutenção · severidade Alta (5) + urgência Média (3) = score 8 · P2 Alta")
                .contains("em 6 min, dentro do prazo (10 min)")
                .endsWith(" · Cliente parado na estrada");
        ChamadoEvento roteamento = ambiente.unicoEventoDoTipo(TipoEvento.ROTEAMENTO);
        assertThat(roteamento.getAcao()).isEqualTo("Encaminhado para Manutenção");
        assertThat(roteamento.isVisivelCliente()).isTrue();
        assertThat(ambiente.notificacoes).singleElement().satisfies(notificacao -> {
            assertThat(notificacao.destinatarioId()).isEqualTo(ANA);
            assertThat(notificacao.novoStatus()).isEqualTo("Na fila");
            assertThat(notificacao.mensagem()).isEqualTo("O chamado VF-0001 foi analisado e encaminhado para Manutenção.");
        });
    }

    @Test
    void triagemConcluidaDepoisDoLimiteFicaRegistradaComoForaDoPrazo() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(25));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 3));

        servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 3, 3, null), paula);

        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.CLASSIFICACAO).getDetalhe()).endsWith("em 25 min, fora do prazo (20 min)");
    }

    @Test
    void p1OperacionalComUrgenciaImediataForaDoExpedienteVaiParaOPlantao() {
        OffsetDateTime quartaANoite = emSaoPaulo("2026-10-21T22:00");
        AmbienteDeChamados ambiente = new AmbienteDeChamados(quartaANoite.plusMinutes(3));
        ambiente.cadastrar(chamadoAberto("VF-0001", quartaANoite));

        ChamadoResponse resposta = servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 5, 5, null), paula);

        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.ASSISTENCIA_24H);
        assertThat(resposta.tipo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.ROTEAMENTO).getDetalhe())
                .isEqualTo("P1 com urgência imediata fora do horário comercial: chamado direcionado ao Plantão da Assistência 24h.");
    }

    @Test
    void emExpedienteSegueParaODepartamentoDoTipo() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        ChamadoResponse resposta = servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 5, 5, null), paula);

        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.ROTEAMENTO).getDetalhe())
                .isEqualTo("Chamado direcionado para a fila de Manutenção.");
    }

    @Test
    void chamadoSemSolicitanteRegistraQueANotificacaoNaoFoiEnviada() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("TI", 1, 1, null), paula);

        assertThat(ambiente.notificacoes).isEmpty();
        assertThat(ambiente.eventoComAcao("Notificação não enviada")).isPresent();
    }

    @Test
    void recusaPesosForaDeUmTresOuCinco() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        Chamado chamado = ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        ErroDeChamado erro = erroAo(() -> servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 4, 0, null), paula));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errosDeCampo(erro)).containsOnlyKeys("severidade", "urgencia");
        assertThat(chamado.triado()).isFalse();
        assertThat(ambiente.registrados).isEmpty();
    }

    @Test
    void recusaTipoDesconhecido() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));
        TriagemService servico = servico(ambiente);

        assertThat(errosDeCampo(erroAo(() -> servico.concluir("VF-0001", new ConcluirTriagemRequest("OFICINA", 3, 3, null), paula))))
                .containsKey("tipo");
    }

    @Test
    void departamentoNaoConsegueTriarPorqueNaoEnxergaAFilaDeTriagem() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        assertThatThrownBy(() -> servico(ambiente).iniciar("VF-0001", departamento(TipoChamado.MANUTENCAO)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void naoConcluiTriagemDuasVezes() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));

        assertThat(erroAo(() -> servico(ambiente).concluir("VF-0001", new ConcluirTriagemRequest("TI", 3, 3, null), paula))
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void reclassificarComOutroTipoMantemODepartamentoEOAtendimento() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        Chamado chamado = ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(20));

        ChamadoResponse resposta = servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("TI", 3, 1, "O problema é no rastreador"), paula);

        assertThat(resposta.tipo()).isEqualTo(TipoChamado.TI);
        assertThat(resposta.prioridade()).isEqualTo(Prioridade.P4);
        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(resposta.status()).isEqualTo("Em atendimento");
        ChamadoEvento reclassificacao = ambiente.unicoEventoDoTipo(TipoEvento.RECLASSIFICACAO);
        assertThat(reclassificacao.isVisivelCliente()).isFalse();
        assertThat(reclassificacao.getDetalhe())
                .contains(" → Tecnologia")
                .contains("continua em Manutenção")
                .endsWith("O problema é no rastreador");
        assertThat(ambiente.eventosDoTipo(TipoEvento.ROTEAMENTO)).isEmpty();
        assertThat(ambiente.eventosDoTipo(TipoEvento.TRANSFERENCIA)).isEmpty();
    }

    @Test
    void reclassificarRespeitaODepartamentoEscolhidoNaTriagem() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        Chamado chamado = ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.LOGISTICA, new Autor(UUID.randomUUID(), "Rui"), QUARTA_AS_DEZ.plusMinutes(5));

        ChamadoResponse resposta = servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("MANUTENCAO", 5, 5, "Freio falhou na saída"), paula);

        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.LOGISTICA);
        assertThat(resposta.status()).isEqualTo("Na fila");
    }

    @Test
    void reclassificarUmChamadoFechadoCorrigeAClassificacaoSemReabrir() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(60));
        Chamado chamado = ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(20));
        chamado.alterarStatus(StatusChamado.FECHADO, null, QUARTA_AS_DEZ.plusMinutes(30));

        ChamadoResponse resposta = servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("TI", 5, 5, "Era falha no sistema de telemetria"), paula);

        assertThat(resposta.tipo()).isEqualTo(TipoChamado.TI);
        assertThat(resposta.status()).isEqualTo("Fechado");
        assertThat(resposta.departamento().codigo()).isEqualTo(TipoChamado.MANUTENCAO);
    }

    @Test
    void reclassificarMantendoOTipoNaoMudaODepartamento() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        Chamado chamado = ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));
        chamado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, QUARTA_AS_DEZ.plusMinutes(20));

        ChamadoResponse resposta = servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("MANUTENCAO", 5, 5, "Freio falhou de novo"), paula);

        assertThat(resposta.prioridade()).isEqualTo(Prioridade.P1);
        assertThat(resposta.status()).isEqualTo("Em atendimento");
        assertThat(ambiente.eventosDoTipo(TipoEvento.ROTEAMENTO)).isEmpty();
    }

    @Test
    void overrideDefinidoERemovidoFicaNoHistoricoInterno() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 1, 1));
        TriagemService servico = servico(ambiente);

        ChamadoResponse comOverride = servico.definirOverride("VF-0001", new OverrideRequest("p1", "  Cliente estratégico  "), paula);

        assertThat(comOverride.prioridade()).isEqualTo(Prioridade.P1);
        assertThat(comOverride.override().justificativa()).isEqualTo("Cliente estratégico");
        assertThat(comOverride.override().autor()).isEqualTo(autor(paula));

        ChamadoResponse semOverride = servico.removerOverride("VF-0001", paula);

        assertThat(semOverride.prioridade()).isEqualTo(Prioridade.P4);
        assertThat(semOverride.override()).isNull();
        assertThat(ambiente.eventosDoTipo(TipoEvento.OVERRIDE))
                .extracting(ChamadoEvento::getDetalhe)
                .containsExactly("P4 → P1 · Cliente estratégico", "P1 → P4 (prioridade calculada)");
        assertThat(ambiente.eventosDoTipo(TipoEvento.OVERRIDE)).noneMatch(ChamadoEvento::isVisivelCliente);
    }

    @Test
    void recusaPrioridadeDesconhecidaNoOverride() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 1, 1));

        ErroDeChamado erro = erroAo(() -> servico(ambiente).definirOverride("VF-0001", new OverrideRequest("P0", "Cliente estratégico"), paula));

        assertThat(errosDeCampo(erro)).containsEntry("prioridade", "Prioridade inválida.");
    }

    private static TriagemService servico(AmbienteDeChamados ambiente) {
        return new TriagemService(ambiente.acesso, ambiente.historico, new RoteamentoComPlantao(EXPEDIENTE), ambiente.aviso,
                ambiente.montagem, ambiente.relogio);
    }

    @Test
    void assumirAnaliseDeChamadoClassificadoPeloRelatoMantemFilaEStatus() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        Chamado chamado = ambiente.cadastrar(chamadoClassificadoPeloRelato(TipoChamado.FINANCEIRO));

        ChamadoResponse resposta = servico(ambiente).iniciar("VF-0001", paula);

        assertThat(resposta.status()).isEqualTo("Na fila");
        assertThat(resposta.triagem().responsavel()).isEqualTo(autor(paula));
        assertThat(resposta.triagem().revisaoPendente()).isTrue();
        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.FINANCEIRO);
        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.TRIAGEM).isVisivelCliente()).isFalse();
    }

    @Test
    void confirmarClassificacaoEncerraARevisaoSemMudarAFila() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        Chamado chamado = ambiente.cadastrar(chamadoClassificadoPeloRelato(TipoChamado.FINANCEIRO));

        ChamadoResponse resposta = servico(ambiente).confirmarClassificacao("VF-0001", paula);

        assertThat(resposta.triagem().revisaoPendente()).isFalse();
        assertThat(chamado.getClassificacaoEstado()).isEqualTo(Chamado.ESTADO_CLASSIFICADA);
        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.FINANCEIRO);
        assertThat(ambiente.eventoComAcao("Classificação confirmada")).isPresent();
        assertThat(erroAo(() -> servico(ambiente).confirmarClassificacao("VF-0001", paula)).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void reclassificarDuranteARevisaoReencaminhaParaODepartamentoDoNovoTipo() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(3));
        Chamado chamado = ambiente.cadastrar(chamadoClassificadoPeloRelato(TipoChamado.ASSISTENCIA_24H));

        servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("FINANCEIRO", 3, 3, "Relato trata de cobrança indevida."), paula);

        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.FINANCEIRO);
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
        assertThat(chamado.revisaoPendente()).isFalse();
        assertThat(ambiente.eventoComAcao("Encaminhado para Financeiro")).isPresent();
    }

    @Test
    void reclassificarForaDaRevisaoNaoMudaODepartamento() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
        Chamado chamado = ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));

        servico(ambiente).reclassificar("VF-0001",
                new ReclassificacaoRequest("FINANCEIRO", 3, 3, "Ajuste de classificação."), paula);

        assertThat(chamado.getDepartamento()).isEqualTo(TipoChamado.MANUTENCAO);
    }

    private static Chamado chamadoClassificadoPeloRelato(TipoChamado tipo) {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        chamado.classificarPorTexto(tipo, 3, 3, tipo, QUARTA_AS_DEZ);
        return chamado;
    }
}
