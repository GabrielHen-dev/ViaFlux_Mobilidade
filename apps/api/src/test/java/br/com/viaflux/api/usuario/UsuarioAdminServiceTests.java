package br.com.viaflux.api.usuario;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class UsuarioAdminServiceTests {

    private static final UUID ADMIN = UUID.randomUUID();

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PerfilRepository perfis = mock(PerfilRepository.class);
    private final ApplicationEventPublisher eventos = mock(ApplicationEventPublisher.class);
    private final UsuarioAdminService servico = new UsuarioAdminService(usuarios, perfis, mock(OrganizacaoRepository.class),
            mock(DepartamentoRepository.class), eventos);

    @BeforeEach
    void preparar() {
        given(perfis.findAllById(Set.of("ATENDENTE"))).willReturn(List.of(perfil("ATENDENTE")));
        given(usuarios.findByEmail(anyString())).willReturn(Optional.empty());
        given(usuarios.save(any(Usuario.class))).willAnswer(invocacao -> comId(invocacao.getArgument(0)));
    }

    @Test
    void convidaUsuarioSemSenhaEPublicaOConvite() {
        UsuarioAdminResponse criado = servico.criar(
                new CriarUsuarioRequest(" Paula Atendente ", "Paula@ViaFlux.local", Set.of("ATENDENTE"), null, Set.of()), ADMIN);

        assertThat(criado.nome()).isEqualTo("Paula Atendente");
        assertThat(criado.email()).isEqualTo("paula@viaflux.local");
        assertThat(criado.convitePendente()).isTrue();
        then(eventos).should().publishEvent(new ConviteSolicitado(criado.id(), ADMIN));
    }

    @Test
    void naoConvidaEmailJaCadastrado() {
        given(usuarios.findByEmail("paula@viaflux.local")).willReturn(Optional.of(pendente()));

        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class, () -> servico.criar(
                new CriarUsuarioRequest("Paula", "paula@viaflux.local", Set.of("ATENDENTE"), null, Set.of()), ADMIN));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        then(eventos).should(never()).publishEvent(any(Object.class));
    }

    @Test
    void reenviaConviteSomenteParaUsuarioAtivoComConvitePendente() {
        Usuario paula = pendente();
        given(usuarios.findById(paula.getId())).willReturn(Optional.of(paula));

        assertThat(servico.reenviarConvite(paula.getId(), ADMIN).convitePendente()).isTrue();
        then(eventos).should().publishEvent(new ConviteSolicitado(paula.getId(), ADMIN));

        paula.alterarAtivo(false);
        assertThat(status(() -> servico.reenviarConvite(paula.getId(), ADMIN))).isEqualTo(HttpStatus.BAD_REQUEST);

        paula.alterarAtivo(true);
        paula.atualizarSenhaHash("hash");
        assertThat(status(() -> servico.reenviarConvite(paula.getId(), ADMIN))).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void trocarOEmailDeConvitePendenteEnviaConviteNovo() {
        Usuario paula = pendente();
        given(usuarios.findById(paula.getId())).willReturn(Optional.of(paula));

        servico.atualizar(paula.getId(), new AtualizarUsuarioRequest("Paula Souza", "paula@viaflux.local",
                Set.of("ATENDENTE"), null, Set.of()), ADMIN);
        then(eventos).should(never()).publishEvent(any(Object.class));

        servico.atualizar(paula.getId(), new AtualizarUsuarioRequest("Paula Souza", "paula.souza@viaflux.local",
                Set.of("ATENDENTE"), null, Set.of()), ADMIN);
        then(eventos).should().publishEvent(new ConviteSolicitado(paula.getId(), ADMIN));
        assertThat(paula.getEmail()).isEqualTo("paula.souza@viaflux.local");
    }

    private Usuario pendente() {
        return comId(Usuario.convidado("Paula Atendente", "paula@viaflux.local", Set.of(perfil("ATENDENTE")), null, Set.of()));
    }

    private static Usuario comId(Usuario usuario) {
        if (usuario.getId() == null) {
            ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        }
        return usuario;
    }

    private static HttpStatus status(Runnable acao) {
        return (HttpStatus) catchThrowableOfType(ResponseStatusException.class, acao::run).getStatusCode();
    }

    private static Perfil perfil(String codigo) {
        Perfil perfil = BeanUtils.instantiateClass(Perfil.class);
        ReflectionTestUtils.setField(perfil, "codigo", codigo);
        ReflectionTestUtils.setField(perfil, "descricao", codigo);
        return perfil;
    }
}
