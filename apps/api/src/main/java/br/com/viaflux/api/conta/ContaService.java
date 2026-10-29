package br.com.viaflux.api.conta;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import br.com.viaflux.api.usuario.ConviteSolicitado;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.PerfilRepository;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
class ContaService {

    static final String PERFIL_CLIENTE = "CLIENTE";
    static final String LINK_INVALIDO = "Este link é inválido, já foi usado ou expirou. Peça um novo.";
    static final String CONVIDANTE_PADRAO = "A equipe ViaFlux";

    private final UsuarioRepository usuarios;
    private final PerfilRepository perfis;
    private final TokenDeContaRepository tokens;
    private final GeradorDeTokens gerador;
    private final MensagensDeConta mensagens;
    private final CaixaDeSaida caixaDeSaida;
    private final PasswordEncoder passwordEncoder;
    private final LimiteDeTentativas limite;
    private final ContaProperties propriedades;
    private final Clock relogio;

    ContaService(UsuarioRepository usuarios, PerfilRepository perfis, TokenDeContaRepository tokens, GeradorDeTokens gerador,
                 MensagensDeConta mensagens, CaixaDeSaida caixaDeSaida, PasswordEncoder passwordEncoder,
                 LimiteDeTentativas limite, ContaProperties propriedades, Clock relogio) {
        this.usuarios = usuarios;
        this.perfis = perfis;
        this.tokens = tokens;
        this.gerador = gerador;
        this.mensagens = mensagens;
        this.caixaDeSaida = caixaDeSaida;
        this.passwordEncoder = passwordEncoder;
        this.limite = limite;
        this.propriedades = propriedades;
        this.relogio = relogio;
    }

    @Transactional
    void cadastrar(ContaController.CadastroRequest pedido, String origem) {
        String email = Usuario.normalizarEmail(pedido.email());
        limite.consumir("cadastro:" + email);
        limite.consumir("cadastro-origem:" + origem);
        Optional<Usuario> existente = usuarios.findByEmail(email);
        if (existente.isPresent()) {
            existente.filter(Usuario::isAtivo).ifPresent(usuario -> caixaDeSaida.enviar(mensagens.cadastroRepetido(usuario)));
            return;
        }
        Perfil cliente = perfis.findById(PERFIL_CLIENTE)
                .orElseThrow(() -> new IllegalStateException("Perfil CLIENTE ausente no banco."));
        Usuario usuario = new Usuario(pedido.nome().trim(), email, passwordEncoder.encode(pedido.senha()), Set.of(cliente));
        usuario.definirTelefone(pedido.telefone());
        usuario.registrarAceiteDosTermos(propriedades.termosVersao(), agora());
        usuarios.save(usuario);
        enviarVerificacao(usuario);
    }

    @Transactional
    void confirmarEmail(String token) {
        TokenDeConta encontrado = tokenUtilizavel(token, FinalidadeDoToken.VERIFICACAO);
        OffsetDateTime agora = agora();
        encontrado.getUsuario().confirmarEmail(agora);
        encontrado.usar(agora);
    }

    @Transactional
    void reenviarVerificacao(String emailInformado, String origem) {
        String email = Usuario.normalizarEmail(emailInformado);
        limite.consumir("verificacao:" + email);
        limite.consumir("verificacao-origem:" + origem);
        usuarios.findByEmail(email)
                .filter(Usuario::isAtivo)
                .filter(usuario -> !usuario.convitePendente())
                .filter(usuario -> !usuario.emailVerificado())
                .ifPresent(this::enviarVerificacao);
    }

    @Transactional
    void solicitarRedefinicao(String emailInformado, String origem) {
        String email = Usuario.normalizarEmail(emailInformado);
        limite.consumir("redefinicao:" + email);
        limite.consumir("redefinicao-origem:" + origem);
        usuarios.findByEmail(email)
                .filter(Usuario::isAtivo)
                .ifPresent(usuario -> {
                    String token = emitir(usuario, FinalidadeDoToken.REDEFINICAO, propriedades.validadeDaRedefinicao().toMinutes());
                    caixaDeSaida.enviar(mensagens.redefinicao(usuario, token));
                });
    }

    @Transactional
    void redefinirSenha(String token, String novaSenha) {
        TokenDeConta encontrado = tokenUtilizavel(token, FinalidadeDoToken.REDEFINICAO);
        Usuario usuario = encontrado.getUsuario();
        if (!usuario.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, LINK_INVALIDO);
        }
        OffsetDateTime agora = agora();
        usuario.atualizarSenhaHash(passwordEncoder.encode(novaSenha));
        usuario.confirmarEmail(agora);
        usuario.encerrarSessoes();
        encontrado.usar(agora);
        caixaDeSaida.enviar(mensagens.senhaAlterada(usuario));
    }

    @Transactional(readOnly = true)
    ContaController.ConviteResponse consultarConvite(String token) {
        Usuario convidado = conviteUtilizavel(token).getUsuario();
        return new ContaController.ConviteResponse(
                convidado.getNome(),
                convidado.getEmail(),
                convidado.getPerfis().stream()
                        .sorted(Comparator.comparing(Perfil::getDescricao))
                        .map(perfil -> new ContaController.PerfilDoConvite(perfil.getCodigo(), perfil.getDescricao()))
                        .toList()
        );
    }

    @Transactional
    void aceitarConvite(String token, String senha) {
        TokenDeConta convite = conviteUtilizavel(token);
        Usuario convidado = convite.getUsuario();
        OffsetDateTime agora = agora();
        convidado.atualizarSenhaHash(passwordEncoder.encode(senha));
        convidado.confirmarEmail(agora);
        convite.usar(agora);
    }

    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void aoSolicitarConvite(ConviteSolicitado evento) {
        usuarios.findById(evento.usuarioId())
                .filter(Usuario::isAtivo)
                .filter(Usuario::convitePendente)
                .ifPresent(convidado -> {
                    String token = emitir(convidado, FinalidadeDoToken.CONVITE, propriedades.validadeDoConvite().toMinutes());
                    caixaDeSaida.enviar(mensagens.convite(convidado, token, nomeDoConvidante(evento.convidanteId())));
                });
    }

    private String nomeDoConvidante(UUID convidanteId) {
        return Optional.ofNullable(convidanteId)
                .flatMap(usuarios::findById)
                .map(Usuario::getNome)
                .orElse(CONVIDANTE_PADRAO);
    }

    private TokenDeConta conviteUtilizavel(String token) {
        TokenDeConta convite = tokenUtilizavel(token, FinalidadeDoToken.CONVITE);
        Usuario convidado = convite.getUsuario();
        if (!convidado.isAtivo() || !convidado.convitePendente()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, LINK_INVALIDO);
        }
        return convite;
    }

    private void enviarVerificacao(Usuario usuario) {
        String token = emitir(usuario, FinalidadeDoToken.VERIFICACAO, propriedades.validadeDaVerificacao().toMinutes());
        caixaDeSaida.enviar(mensagens.verificacao(usuario, token));
    }

    private String emitir(Usuario usuario, FinalidadeDoToken finalidade, long validadeEmMinutos) {
        OffsetDateTime agora = agora();
        tokens.findByUsuarioIdAndFinalidadeAndUsadoEmIsNull(usuario.getId(), finalidade).forEach(anterior -> anterior.usar(agora));
        String token = gerador.novoToken();
        tokens.save(new TokenDeConta(usuario, finalidade, gerador.hash(token), agora, agora.plusMinutes(validadeEmMinutos)));
        return token;
    }

    private TokenDeConta tokenUtilizavel(String token, FinalidadeDoToken finalidade) {
        return tokens.findByHashDoTokenAndFinalidade(gerador.hash(token), finalidade)
                .filter(encontrado -> encontrado.utilizavelEm(agora()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, LINK_INVALIDO));
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }
}
