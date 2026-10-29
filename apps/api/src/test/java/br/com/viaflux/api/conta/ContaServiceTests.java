package br.com.viaflux.api.conta;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.email.ModelosDeEmail;
import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import br.com.viaflux.api.usuario.ConviteSolicitado;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.PerfilRepository;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class ContaServiceTests {

    private static final Instant AGORA = Instant.parse("2026-10-29T12:00:00Z");
    private static final Pattern TOKEN_NO_LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final ContaProperties PROPRIEDADES = new ContaProperties("http://localhost:5261/", "ViaFlux <nao-responda@viaflux.local>",
            "termos-v1", Duration.ofHours(24), Duration.ofMinutes(30), Duration.ofDays(7), 5, Duration.ofMinutes(15));

    private final RelogioAjustavel relogio = new RelogioAjustavel(AGORA);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PerfilRepository perfis = mock(PerfilRepository.class);
    private final TokenDeContaRepository tokens = mock(TokenDeContaRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final List<CaixaDeSaida.Mensagem> enviadas = new ArrayList<>();
    private final List<TokenDeConta> emitidos = new ArrayList<>();
    private final List<Usuario> cadastrados = new ArrayList<>();

    private ContaService servico;

    @BeforeEach
    void preparar() {
        given(perfis.findById("CLIENTE")).willReturn(Optional.of(perfil("CLIENTE")));
        given(usuarios.findByEmail(anyString())).willAnswer(invocacao -> cadastrados.stream()
                .filter(usuario -> usuario.getEmail().equals(invocacao.getArgument(0)))
                .findFirst());
        given(usuarios.findById(any(UUID.class))).willAnswer(invocacao -> cadastrados.stream()
                .filter(usuario -> usuario.getId().equals(invocacao.getArgument(0)))
                .findFirst());
        given(usuarios.save(any(Usuario.class))).willAnswer(invocacao -> {
            Usuario usuario = invocacao.getArgument(0);
            if (usuario.getId() == null) {
                ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
                cadastrados.add(usuario);
            }
            return usuario;
        });
        given(tokens.save(any(TokenDeConta.class))).willAnswer(invocacao -> {
            TokenDeConta token = invocacao.getArgument(0);
            emitidos.add(token);
            return token;
        });
        given(tokens.findByHashDoTokenAndFinalidade(anyString(), any(FinalidadeDoToken.class))).willAnswer(invocacao -> emitidos.stream()
                .filter(token -> ReflectionTestUtils.getField(token, "hashDoToken").equals(invocacao.getArgument(0)))
                .filter(token -> token.getFinalidade() == invocacao.getArgument(1))
                .findFirst());
        given(tokens.findByUsuarioIdAndFinalidadeAndUsadoEmIsNull(any(UUID.class), any(FinalidadeDoToken.class))).willAnswer(invocacao -> emitidos.stream()
                .filter(token -> token.getUsuario().getId().equals(invocacao.getArgument(0)))
                .filter(token -> token.getFinalidade() == invocacao.getArgument(1))
                .filter(token -> token.getUsadoEm() == null)
                .toList());
        servico = new ContaService(usuarios, perfis, tokens, new GeradorDeTokens(), new MensagensDeConta(PROPRIEDADES, new ModelosDeEmail()),
                enviadas::add, passwordEncoder, new LimiteDeTentativas(5, Duration.ofMinutes(15), relogio), PROPRIEDADES, relogio);
    }

    @Test
    void cadastroCriaClienteSemOrganizacaoRegistraOAceiteEEnviaAVerificacao() {
        servico.cadastrar(cadastro(" Ana@Exemplo.com "), "10.0.0.1");

        Usuario ana = cadastrados.getFirst();
        assertThat(ana.getEmail()).isEqualTo("ana@exemplo.com");
        assertThat(ana.getPerfis()).extracting(Perfil::getCodigo).containsExactly("CLIENTE");
        assertThat(ana.getOrganizacao()).isNull();
        assertThat(ana.getTelefone()).isEqualTo("(85) 99999-0000");
        assertThat(ana.getTermosVersao()).isEqualTo("termos-v1");
        assertThat(ana.emailVerificado()).isFalse();
        assertThat(passwordEncoder.matches("senha-forte-1", ana.getSenhaHash())).isTrue();
        CaixaDeSaida.Mensagem mensagem = enviadas.getFirst();
        assertThat(mensagem.para()).isEqualTo("ana@exemplo.com");
        assertThat(mensagem.assunto()).isEqualTo("Confirme seu e-mail");
        assertThat(mensagem.texto()).contains("http://localhost:5261/verificar-email?token=").contains("24 horas");
        assertThat(mensagem.html()).contains("href=\"http://localhost:5261/verificar-email?token=").contains("Confirmar e-mail");
        assertThat(ReflectionTestUtils.getField(emitidos.getFirst(), "hashDoToken")).isNotEqualTo(tokenDe(mensagem));
    }

    @Test
    void cadastroComEmailExistenteNaoCriaOutraContaEAvisaODono() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        enviadas.clear();

        servico.cadastrar(cadastro("ANA@exemplo.com"), "10.0.0.2");

        assertThat(cadastrados).hasSize(1);
        assertThat(enviadas).singleElement().satisfies(mensagem -> {
            assertThat(mensagem.para()).isEqualTo("ana@exemplo.com");
            assertThat(mensagem.assunto()).isEqualTo("Tentativa de cadastro com seu e-mail");
            assertThat(mensagem.html()).contains("http://localhost:5261/esqueci-a-senha").contains("http://localhost:5261/login");
        });
    }

    @Test
    void linkDeVerificacaoConfirmaOEmailUmaUnicaVez() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        String token = tokenDe(enviadas.getFirst());

        servico.confirmarEmail(token);

        assertThat(cadastrados.getFirst().emailVerificado()).isTrue();
        assertThat(linkInvalido(() -> servico.confirmarEmail(token))).isEqualTo(ContaService.LINK_INVALIDO);
    }

    @Test
    void linkDeVerificacaoExpiraEm24Horas() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        String token = tokenDe(enviadas.getFirst());
        relogio.avancar(Duration.ofHours(24));

        assertThat(linkInvalido(() -> servico.confirmarEmail(token))).isEqualTo(ContaService.LINK_INVALIDO);
        assertThat(cadastrados.getFirst().emailVerificado()).isFalse();
    }

    @Test
    void reenvioInvalidaOLinkAnteriorENaoEnviaParaContaJaVerificada() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        String primeiro = tokenDe(enviadas.getFirst());

        servico.reenviarVerificacao("ana@exemplo.com", "10.0.0.1");
        String segundo = tokenDe(enviadas.get(1));

        assertThat(linkInvalido(() -> servico.confirmarEmail(primeiro))).isEqualTo(ContaService.LINK_INVALIDO);
        servico.confirmarEmail(segundo);
        servico.reenviarVerificacao("ana@exemplo.com", "10.0.0.1");
        assertThat(enviadas).hasSize(2);
    }

    @Test
    void recuperacaoParaEmailDesconhecidoNaoFalhaNemEnvia() {
        servico.solicitarRedefinicao("ninguem@exemplo.com", "10.0.0.1");

        assertThat(enviadas).isEmpty();
        then(tokens).should(never()).save(any());
    }

    @Test
    void redefinicaoTrocaASenhaEncerraAsSessoesConfirmaOEmailEAvisaODono() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        Usuario ana = cadastrados.getFirst();
        int versaoAnterior = ana.getVersaoDaSessao();
        servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.1");
        CaixaDeSaida.Mensagem pedido = enviadas.get(1);
        assertThat(pedido.assunto()).isEqualTo("Redefinição de senha");
        assertThat(pedido.texto()).contains("http://localhost:5261/redefinir-senha?token=").contains("30 minutos");

        servico.redefinirSenha(tokenDe(pedido), "senha-nova-2");

        assertThat(passwordEncoder.matches("senha-nova-2", ana.getSenhaHash())).isTrue();
        assertThat(ana.getVersaoDaSessao()).isEqualTo(versaoAnterior + 1);
        assertThat(ana.emailVerificado()).isTrue();
        assertThat(enviadas.getLast().assunto()).isEqualTo("Sua senha foi alterada");
        assertThat(linkInvalido(() -> servico.redefinirSenha(tokenDe(pedido), "outra-senha-3"))).isEqualTo(ContaService.LINK_INVALIDO);
    }

    @Test
    void linkDeRedefinicaoExpiraEm30MinutosEUmPedidoNovoInvalidaOAnterior() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.1");
        String primeiro = tokenDe(enviadas.get(1));
        servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.1");
        String segundo = tokenDe(enviadas.get(2));

        assertThat(linkInvalido(() -> servico.redefinirSenha(primeiro, "senha-nova-2"))).isEqualTo(ContaService.LINK_INVALIDO);
        relogio.avancar(Duration.ofMinutes(30));
        assertThat(linkInvalido(() -> servico.redefinirSenha(segundo, "senha-nova-2"))).isEqualTo(ContaService.LINK_INVALIDO);
    }

    @Test
    void contaDesativadaNaoRecebeNemUsaOLinkDeRedefinicao() {
        servico.cadastrar(cadastro("ana@exemplo.com"), "10.0.0.1");
        servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.1");
        String token = tokenDe(enviadas.get(1));
        cadastrados.getFirst().alterarAtivo(false);

        servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.1");

        assertThat(enviadas).hasSize(2);
        assertThat(linkInvalido(() -> servico.redefinirSenha(token, "senha-nova-2"))).isEqualTo(ContaService.LINK_INVALIDO);
    }

    @Test
    void limitaOsPedidosDeRecuperacaoPorEmail() {
        for (int tentativa = 0; tentativa < 5; tentativa++) {
            servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0." + tentativa);
        }

        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class,
                () -> servico.solicitarRedefinicao("ana@exemplo.com", "10.0.0.9"));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void conviteInformaQuemConvidouOsPerfisEOLinkDeAceite() {
        Usuario carla = usuarios.save(new Usuario("Carla Admin", "carla@viaflux.local", "hash", Set.of(perfil("ADMIN"))));
        Usuario paula = convidar("Paula Atendente", "paula@viaflux.local", "ATENDENTE", "LIDER_OPERACIONAL");

        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), carla.getId()));

        CaixaDeSaida.Mensagem convite = enviadas.getFirst();
        assertThat(convite.para()).isEqualTo("paula@viaflux.local");
        assertThat(convite.assunto()).isEqualTo("Convite de acesso à ViaFlux Mobilidade");
        assertThat(convite.texto())
                .contains("Carla Admin convidou você")
                .contains("Perfis: ATENDENTE, LIDER_OPERACIONAL")
                .contains("http://localhost:5261/aceitar-convite?token=")
                .contains("7 dias");
        assertThat(convite.html()).contains("Aceitar convite").contains("#0F2C59").contains("Carla Admin");
        assertThat(emitidos.getFirst().getFinalidade()).isEqualTo(FinalidadeDoToken.CONVITE);
    }

    @Test
    void conviteSemConvidanteConhecidoUsaAEquipeViaFlux() {
        Usuario paula = convidar("Paula Atendente", "paula@viaflux.local", "ATENDENTE");

        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));

        assertThat(enviadas.getFirst().texto()).contains(ContaService.CONVIDANTE_PADRAO + " convidou você").contains("Perfil: ATENDENTE");
    }

    @Test
    void nomesNoConviteSaoEscapadosNoHtml() {
        Usuario carla = usuarios.save(new Usuario("Carla <script>alert(1)</script>", "carla@viaflux.local", "hash", Set.of(perfil("ADMIN"))));
        Usuario paula = convidar("<b>Paula</b> & \"Cia\"", "paula@viaflux.local", "ATENDENTE");

        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), carla.getId()));

        CaixaDeSaida.Mensagem convite = enviadas.getFirst();
        assertThat(convite.html())
                .doesNotContain("<script>")
                .doesNotContain("<b>Paula</b>")
                .contains("Carla &lt;script&gt;alert(1)&lt;/script&gt;")
                .contains("&lt;b&gt;Paula&lt;/b&gt; &amp; &quot;Cia&quot;");
        assertThat(convite.texto()).contains("Olá, <b>Paula</b> & \"Cia\".");
    }

    @Test
    void aceiteDoConviteDefineASenhaConfirmaOEmailEInvalidaOLink() {
        Usuario paula = convidar("Paula Atendente", "paula@viaflux.local", "ATENDENTE");
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        String token = tokenDe(enviadas.getFirst());

        ContaController.ConviteResponse convite = servico.consultarConvite(token);
        assertThat(convite.nome()).isEqualTo("Paula Atendente");
        assertThat(convite.email()).isEqualTo("paula@viaflux.local");
        assertThat(convite.perfis()).containsExactly(new ContaController.PerfilDoConvite("ATENDENTE", "ATENDENTE"));

        servico.aceitarConvite(token, "senha-da-paula-1");

        assertThat(paula.convitePendente()).isFalse();
        assertThat(passwordEncoder.matches("senha-da-paula-1", paula.getSenhaHash())).isTrue();
        assertThat(paula.emailVerificado()).isTrue();
        assertThat(linkInvalido(() -> servico.consultarConvite(token))).isEqualTo(ContaService.LINK_INVALIDO);
        assertThat(linkInvalido(() -> servico.aceitarConvite(token, "outra-senha-2"))).isEqualTo(ContaService.LINK_INVALIDO);
    }

    @Test
    void conviteExpiraNoPrazoConfiguradoEOReenvioInvalidaOAnterior() {
        Usuario paula = convidar("Paula Atendente", "paula@viaflux.local", "ATENDENTE");
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        String primeiro = tokenDe(enviadas.getFirst());
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        String segundo = tokenDe(enviadas.get(1));

        assertThat(linkInvalido(() -> servico.consultarConvite(primeiro))).isEqualTo(ContaService.LINK_INVALIDO);
        servico.consultarConvite(segundo);
        relogio.avancar(Duration.ofDays(7));
        assertThat(linkInvalido(() -> servico.consultarConvite(segundo))).isEqualTo(ContaService.LINK_INVALIDO);
        assertThat(paula.convitePendente()).isTrue();
    }

    @Test
    void conviteDeUsuarioDesativadoNaoPodeSerUsadoNemReenviado() {
        Usuario paula = convidar("Paula Atendente", "paula@viaflux.local", "ATENDENTE");
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        String token = tokenDe(enviadas.getFirst());
        paula.alterarAtivo(false);

        assertThat(linkInvalido(() -> servico.aceitarConvite(token, "senha-da-paula-1"))).isEqualTo(ContaService.LINK_INVALIDO);
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        assertThat(enviadas).hasSize(1);
    }

    @Test
    void naoEnviaConviteParaQuemJaAtivouNemVerificacaoParaConvitePendente() {
        Usuario paula = usuarios.save(new Usuario("Paula Atendente", "paula@viaflux.local", "hash", Set.of(perfil("ATENDENTE"))));
        servico.aoSolicitarConvite(new ConviteSolicitado(paula.getId(), null));
        Usuario rui = convidar("Rui Atendente", "rui@viaflux.local", "ATENDENTE");
        servico.reenviarVerificacao("rui@viaflux.local", "10.0.0.1");

        assertThat(enviadas).isEmpty();
        assertThat(rui.convitePendente()).isTrue();
    }

    private Usuario convidar(String nome, String email, String... codigosDosPerfis) {
        Set<Perfil> perfisDoConvidado = Arrays.stream(codigosDosPerfis).map(ContaServiceTests::perfil).collect(Collectors.toSet());
        return usuarios.save(Usuario.convidado(nome, email, perfisDoConvidado, null, Set.of()));
    }

    private static ContaController.CadastroRequest cadastro(String email) {
        return new ContaController.CadastroRequest("Ana Cliente", email, "senha-forte-1", "(85) 99999-0000", true);
    }

    private static String tokenDe(CaixaDeSaida.Mensagem mensagem) {
        Matcher encontrado = TOKEN_NO_LINK.matcher(mensagem.texto());
        assertThat(encontrado.find()).isTrue();
        return encontrado.group(1);
    }

    private static String linkInvalido(Runnable acao) {
        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class, acao::run);
        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        return erro.getReason();
    }

    private static Perfil perfil(String codigo) {
        Perfil perfil = BeanUtils.instantiateClass(Perfil.class);
        ReflectionTestUtils.setField(perfil, "codigo", codigo);
        ReflectionTestUtils.setField(perfil, "descricao", codigo);
        return perfil;
    }

    private static final class RelogioAjustavel extends Clock {

        private Instant agora;

        RelogioAjustavel(Instant agora) {
            this.agora = agora;
        }

        void avancar(Duration intervalo) {
            agora = agora.plus(intervalo);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }
}
