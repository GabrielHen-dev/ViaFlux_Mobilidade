package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.chamado.AcessoDoDestinatario;
import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.email.ModelosDeEmail;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MensagensNaCentralTests {

    private static final OffsetDateTime AGORA = OffsetDateTime.of(2026, 11, 4, 10, 0, 0, 0, ZoneOffset.UTC);
    private static final UUID DESTINATARIO = UUID.randomUUID();
    private static final UUID CHAMADO = UUID.randomUUID();

    private final NotificacaoRepository notificacoes = mock(NotificacaoRepository.class);
    private final ApplicationEventPublisher eventos = mock(ApplicationEventPublisher.class);
    private final AcessoDoDestinatario acesso = mock(AcessoDoDestinatario.class);
    private final CentralDeNotificacoes central = new CentralDeNotificacoes(notificacoes, eventos, acesso);

    private static Notificacao pendente(UUID destinatario) {
        return Notificacao.comEmailAdiado(destinatario, CHAMADO, "VF-0001", "Nova mensagem", "Ana: oi", AGORA);
    }

    private static Object esperaDoEmail(Notificacao notificacao) {
        return ReflectionTestUtils.getField(notificacao, "emailAdiadoDesde");
    }

    private void semPendente() {
        given(notificacoes.findFirstByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalseOrderByCriadaEmDesc(DESTINATARIO, CHAMADO, "Nova mensagem"))
                .willReturn(Optional.empty());
    }

    @Test
    void novaMensagemVaiParaOPortalSemEnviarEmailNaHora() {
        semPendente();

        central.avisarNovaMensagem(DESTINATARIO, CHAMADO, "VF-0001", "Ana: oi", AGORA);

        ArgumentCaptor<Notificacao> salva = ArgumentCaptor.forClass(Notificacao.class);
        then(notificacoes).should().save(salva.capture());
        assertThat(salva.getValue().getMensagem()).isEqualTo("Ana: oi");
        assertThat(esperaDoEmail(salva.getValue())).isEqualTo(AGORA);
        then(eventos).shouldHaveNoInteractions();
    }

    @Test
    void novaMensagemAtualizaANotificacaoAindaNaoLidaEmVezDeCriarOutra() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findFirstByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalseOrderByCriadaEmDesc(DESTINATARIO, CHAMADO, "Nova mensagem"))
                .willReturn(Optional.of(existente));

        central.avisarNovaMensagem(DESTINATARIO, CHAMADO, "VF-0001", "Ana: tudo bem?", AGORA.plusMinutes(1));

        then(notificacoes).should(never()).save(any(Notificacao.class));
        assertThat(existente.getMensagem()).isEqualTo("Ana: tudo bem?");
        assertThat(existente.getCriadaEm()).isEqualTo(AGORA.plusMinutes(1));
        assertThat(esperaDoEmail(existente)).isEqualTo(AGORA);
    }

    @Test
    void emailVencidoSaiParaQuemAindaVeOChamado() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findByLidaFalseAndEmailAdiadoDesdeLessThanEqual(AGORA.plusMinutes(5))).willReturn(List.of(existente));
        given(acesso.podeVerChamado(DESTINATARIO, CHAMADO)).willReturn(true);

        List<CentralDeNotificacoes.EmailVencido> vencidos = central.emailsVencidos(AGORA.plusMinutes(5));

        assertThat(vencidos).extracting(CentralDeNotificacoes.EmailVencido::conteudo)
                .containsExactly(new NotificacaoRegistrada(DESTINATARIO, "VF-0001", "Nova mensagem", "Ana: oi"));
        assertThat(esperaDoEmail(existente)).isEqualTo(AGORA);
    }

    @Test
    void quemPerdeuOAcessoAoChamadoNaoRecebeEmail() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findByLidaFalseAndEmailAdiadoDesdeLessThanEqual(AGORA.plusMinutes(5))).willReturn(List.of(existente));
        given(acesso.podeVerChamado(DESTINATARIO, CHAMADO)).willReturn(false);

        assertThat(central.emailsVencidos(AGORA.plusMinutes(5))).isEmpty();
        assertThat(esperaDoEmail(existente)).isNull();
    }

    @Test
    void emailEntregueNaoEnviaDeNovo() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findById(existente.getId())).willReturn(Optional.of(existente));

        central.registrarTentativaDeEmail(existente.getId(), true);

        assertThat(esperaDoEmail(existente)).isNull();
    }

    @Test
    void falhaNoEnvioMantemOEmailParaNovaTentativaAteOLimite() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findById(existente.getId())).willReturn(Optional.of(existente));

        for (int tentativa = 1; tentativa < 5; tentativa++) {
            central.registrarTentativaDeEmail(existente.getId(), false);
            assertThat(esperaDoEmail(existente)).isEqualTo(AGORA);
        }
        central.registrarTentativaDeEmail(existente.getId(), false);

        assertThat(esperaDoEmail(existente)).isNull();
    }

    @Test
    void lerAConversaCancelaOEmailPendente() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalse(DESTINATARIO, CHAMADO, "Nova mensagem")).willReturn(List.of(existente));

        central.marcarMensagensComoLidas(DESTINATARIO, CHAMADO, AGORA);

        assertThat(existente.isLida()).isTrue();
        assertThat(esperaDoEmail(existente)).isNull();
    }

    @Test
    void leituraNaoConcluiAvisoDeMensagemMaisNova() {
        Notificacao existente = pendente(DESTINATARIO);
        given(notificacoes.findByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalse(DESTINATARIO, CHAMADO, "Nova mensagem")).willReturn(List.of(existente));

        central.marcarMensagensComoLidas(DESTINATARIO, CHAMADO, AGORA.minusSeconds(1));

        assertThat(existente.isLida()).isFalse();
        assertThat(esperaDoEmail(existente)).isEqualTo(AGORA);
    }

    @Test
    void dispensarEmailsDaEquipePreservaOAvisoDoSolicitante() {
        UUID solicitante = UUID.randomUUID();
        Notificacao doColega = pendente(DESTINATARIO);
        Notificacao doSolicitante = pendente(solicitante);
        given(notificacoes.findByChamadoIdAndNovoStatusAndEmailAdiadoDesdeIsNotNull(CHAMADO, "Nova mensagem")).willReturn(List.of(doColega, doSolicitante));

        central.dispensarEmailsDaEquipe(CHAMADO, solicitante);

        assertThat(esperaDoEmail(doColega)).isNull();
        assertThat(doColega.isLida()).isFalse();
        assertThat(esperaDoEmail(doSolicitante)).isEqualTo(AGORA);
    }

    @Test
    void mensagemLongaRespeitaOTamanhoDaColuna() {
        semPendente();

        central.avisarNovaMensagem(DESTINATARIO, CHAMADO, "VF-0001", "x".repeat(300), AGORA);

        ArgumentCaptor<Notificacao> salva = ArgumentCaptor.forClass(Notificacao.class);
        then(notificacoes).should().save(salva.capture());
        assertThat(salva.getValue().getMensagem()).hasSize(255);
    }

    @Test
    void agendaRegistraOResultadoDeCadaEnvio() {
        CentralDeNotificacoes centralSimulada = mock(CentralDeNotificacoes.class);
        AvisoPorEmail aviso = mock(AvisoPorEmail.class);
        Clock relogio = Clock.fixed(AGORA.toInstant(), ZoneOffset.UTC);
        UUID notificacaoId = UUID.randomUUID();
        NotificacaoRegistrada conteudo = new NotificacaoRegistrada(DESTINATARIO, "VF-0001", "Nova mensagem", "Ana: oi");
        given(centralSimulada.emailsVencidos(any(OffsetDateTime.class))).willReturn(List.of(new CentralDeNotificacoes.EmailVencido(notificacaoId, conteudo)));
        given(aviso.entregar(conteudo)).willReturn(false);

        new AgendaDeEmailsDeMensagens(centralSimulada, aviso, relogio, Duration.ofMinutes(5)).enviarEmailsVencidos();

        verify(centralSimulada).registrarTentativaDeEmail(notificacaoId, false);
    }

    @Test
    void entregaInformaFalhaDoEnvio() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        CaixaDeSaida caixaQueFalha = mensagem -> {
            throw new IllegalStateException("SMTP fora do ar");
        };
        given(usuarios.findById(DESTINATARIO)).willThrow(new IllegalStateException("banco fora do ar"));
        AvisoPorEmail aviso = new AvisoPorEmail(usuarios, caixaQueFalha, new ModelosDeEmail(), "http://localhost:5261");

        assertThat(aviso.entregar(new NotificacaoRegistrada(DESTINATARIO, "VF-0001", "Nova mensagem", "Ana: oi"))).isFalse();
    }
}
