package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.email.ModelosDeEmail;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;

class AvisoPorEmailTests {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final List<CaixaDeSaida.Mensagem> enviadas = new ArrayList<>();
    private final AvisoPorEmail aviso = new AvisoPorEmail(usuarios, enviadas::add, new ModelosDeEmail(), "http://localhost:5261/");

    @Test
    void clienteRecebeOLinkDoPortalComOStatusEAMensagem() {
        Usuario ana = usuario("Ana Cliente", "ana@exemplo.com", "CLIENTE");

        aviso.aoRegistrarNotificacao(new NotificacaoRegistrada(ana.getId(), "CH-0042", "Resolvido",
                "Confirme se o chamado CH-0042 foi resolvido."));

        CaixaDeSaida.Mensagem email = enviadas.getFirst();
        assertThat(email.para()).isEqualTo("ana@exemplo.com");
        assertThat(email.assunto()).isEqualTo("Chamado CH-0042: Resolvido");
        assertThat(email.html())
                .contains("Chamado resolvido")
                .contains("Chamado CH-0042")
                .contains("#F0FDF4")
                .contains("Confirme se o chamado CH-0042 foi resolvido.")
                .contains("href=\"http://localhost:5261/portal/chamados/CH-0042\"")
                .contains("Acompanhar chamado");
        assertThat(email.texto()).contains("Acompanhar chamado: http://localhost:5261/portal/chamados/CH-0042");
    }

    @Test
    void equipeInternaRecebeOLinkDaCentralETituloGenericoParaStatusDesconhecido() {
        Usuario lider = usuario("Lia Líder", "lia@viaflux.local", "LIDER_OPERACIONAL", "CLIENTE");

        aviso.aoRegistrarNotificacao(new NotificacaoRegistrada(lider.getId(), "CH-0042", "Escalado para a liderança",
                "O chamado <b>CH-0042</b> estourou o SLA."));

        CaixaDeSaida.Mensagem email = enviadas.getFirst();
        assertThat(email.html())
                .contains("Atualização do chamado")
                .contains("href=\"http://localhost:5261/chamados/CH-0042\"")
                .contains("O chamado &lt;b&gt;CH-0042&lt;/b&gt; estourou o SLA.")
                .doesNotContain("<b>CH-0042</b>");
    }

    @Test
    void usuarioInativoOuInexistenteNaoRecebeEmail() {
        Usuario ana = usuario("Ana Cliente", "ana@exemplo.com", "CLIENTE");
        ana.alterarAtivo(false);

        aviso.aoRegistrarNotificacao(new NotificacaoRegistrada(ana.getId(), "CH-0042", "Na fila", "Mensagem"));
        aviso.aoRegistrarNotificacao(new NotificacaoRegistrada(UUID.randomUUID(), "CH-0042", "Na fila", "Mensagem"));

        assertThat(enviadas).isEmpty();
    }

    @Test
    void falhaNoEnvioNaoPropaga() {
        Usuario ana = usuario("Ana Cliente", "ana@exemplo.com", "CLIENTE");
        AvisoPorEmail comFalha = new AvisoPorEmail(usuarios, mensagem -> {
            throw new IllegalStateException("SMTP fora do ar");
        }, new ModelosDeEmail(), "http://localhost:5261");

        comFalha.aoRegistrarNotificacao(new NotificacaoRegistrada(ana.getId(), "CH-0042", "Na fila", "Mensagem"));
    }

    @Test
    void centralSalvaANotificacaoEPublicaOEventoComAMensagemCompleta() {
        NotificacaoRepository notificacoes = mock(NotificacaoRepository.class);
        ApplicationEventPublisher eventos = mock(ApplicationEventPublisher.class);
        CentralDeNotificacoes central = new CentralDeNotificacoes(notificacoes, eventos);
        UUID destinatario = UUID.randomUUID();
        String mensagemLonga = "x".repeat(300);

        central.enviar(destinatario, UUID.randomUUID(), "CH-0042", "Na fila", mensagemLonga, OffsetDateTime.now());

        then(notificacoes).should().save(any(Notificacao.class));
        then(eventos).should().publishEvent(new NotificacaoRegistrada(destinatario, "CH-0042", "Na fila", mensagemLonga));
    }

    private Usuario usuario(String nome, String email, String... codigosDosPerfis) {
        Usuario usuario = new Usuario(nome, email, "hash", Arrays.stream(codigosDosPerfis).map(AvisoPorEmailTests::perfil)
                .collect(Collectors.toSet()));
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        given(usuarios.findById(usuario.getId())).willReturn(Optional.of(usuario));
        return usuario;
    }

    private static Perfil perfil(String codigo) {
        Perfil perfil = BeanUtils.instantiateClass(Perfil.class);
        ReflectionTestUtils.setField(perfil, "codigo", codigo);
        ReflectionTestUtils.setField(perfil, "descricao", codigo);
        return perfil;
    }
}
