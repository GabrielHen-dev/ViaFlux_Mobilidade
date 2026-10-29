package br.com.viaflux.api.auth;

import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AuthServiceTests {

    private static final UUID ANA = UUID.randomUUID();

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final TokenService tokens = mock(TokenService.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final LimiteDeTentativas limite = new LimiteDeTentativas(5, Duration.ofMinutes(15),
            Clock.fixed(Instant.parse("2026-10-29T12:00:00Z"), ZoneOffset.UTC));
    private final AuthService servico = new AuthService(usuarios, passwordEncoder, tokens, limite);
    private final Usuario ana = new Usuario("Ana Cliente", "ana@exemplo.com", passwordEncoder.encode("senha-certa-1"), Set.of());

    @BeforeEach
    void preparar() {
        ReflectionTestUtils.setField(ana, "id", ANA);
        given(usuarios.findByEmail("ana@exemplo.com")).willReturn(Optional.of(ana));
        given(usuarios.findById(ANA)).willReturn(Optional.of(ana));
        given(tokens.emitir(any(Usuario.class))).willReturn(new TokenService.TokensEmitidos("acesso", "renovacao", Duration.ofMinutes(15)));
    }

    @Test
    void cincoSenhasErradasBloqueiamOLoginMesmoComASenhaCerta() {
        for (int tentativa = 0; tentativa < 5; tentativa++) {
            assertThat(status(() -> servico.entrar("ana@exemplo.com", "errada"))).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(status(() -> servico.entrar("Ana@Exemplo.com", "senha-certa-1"))).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void loginCertoZeraAsFalhasAnteriores() {
        for (int tentativa = 0; tentativa < 4; tentativa++) {
            status(() -> servico.entrar("ana@exemplo.com", "errada"));
        }
        servico.entrar("ana@exemplo.com", "senha-certa-1");

        for (int tentativa = 0; tentativa < 4; tentativa++) {
            assertThat(status(() -> servico.entrar("ana@exemplo.com", "errada"))).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
    }

    @Test
    void refreshTokenEmitidoAntesDaTrocaDeSenhaDeixaDeValer() {
        given(tokens.renovacaoDoRefreshToken("antigo")).willReturn(Optional.of(new TokenService.Renovacao(ANA, 0)));
        ana.encerrarSessoes();

        assertThat(status(() -> servico.renovar("antigo"))).isEqualTo(HttpStatus.UNAUTHORIZED);

        given(tokens.renovacaoDoRefreshToken("novo")).willReturn(Optional.of(new TokenService.Renovacao(ANA, 1)));
        assertThat(servico.renovar("novo").accessToken()).isEqualTo("acesso");
    }

    @Test
    void convitePendenteRecusaOLoginComMensagemPropria() {
        Usuario paula = Usuario.convidado("Paula Atendente", "paula@exemplo.com", Set.of(), null, Set.of());
        given(usuarios.findByEmail("paula@exemplo.com")).willReturn(Optional.of(paula));

        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class,
                () -> servico.entrar("paula@exemplo.com", "qualquer-senha"));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(erro.getReason()).isEqualTo(AuthService.CONVITE_PENDENTE);
        assertThat(catchThrowableOfType(ResponseStatusException.class, () -> servico.entrar("ana@exemplo.com", "errada")).getReason())
                .isEqualTo("E-mail ou senha inválidos.");
    }

    private static HttpStatus status(Runnable acao) {
        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class, acao::run);
        return HttpStatus.valueOf(erro.getStatusCode().value());
    }
}
