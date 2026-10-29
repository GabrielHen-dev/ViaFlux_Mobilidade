package br.com.viaflux.api.auth;

import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import br.com.viaflux.api.usuario.UsuarioResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
class AuthService {

    private static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";
    private static final String SESSAO_EXPIRADA = "Sessão expirada. Entre novamente.";

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final LimiteDeTentativas limite;
    private final String hashParaEmailInexistente;

    AuthService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, TokenService tokens, LimiteDeTentativas limite) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.limite = limite;
        this.hashParaEmailInexistente = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    SessaoResponse entrar(String email, String senha) {
        String emailNormalizado = Usuario.normalizarEmail(email);
        String chaveDoLimite = "login:" + emailNormalizado;
        limite.exigirDisponivel(chaveDoLimite);
        Optional<Usuario> encontrado = usuarios.findByEmail(emailNormalizado);
        String hashComparado = encontrado.map(Usuario::getSenhaHash).orElse(hashParaEmailInexistente);
        boolean senhaConfere = passwordEncoder.matches(senha, hashComparado);

        Optional<SessaoResponse> sessao = encontrado
                .filter(usuario -> senhaConfere && usuario.isAtivo())
                .map(this::abrirSessao);
        if (sessao.isEmpty()) {
            limite.registrar(chaveDoLimite);
            throw naoAutorizado(CREDENCIAIS_INVALIDAS);
        }
        limite.esquecer(chaveDoLimite);
        return sessao.get();
    }

    SessaoResponse renovar(String refreshToken) {
        return tokens.renovacaoDoRefreshToken(refreshToken)
                .flatMap(renovacao -> usuarioAtivo(renovacao.usuarioId())
                        .filter(usuario -> usuario.getVersaoDaSessao() == renovacao.versaoDaSessao()))
                .map(this::abrirSessao)
                .orElseThrow(() -> naoAutorizado(SESSAO_EXPIRADA));
    }

    UsuarioResponse usuarioAtual(UUID id) {
        return usuarioAtivo(id)
                .map(UsuarioResponse::de)
                .orElseThrow(() -> naoAutorizado(SESSAO_EXPIRADA));
    }

    private Optional<Usuario> usuarioAtivo(UUID id) {
        return usuarios.findById(id).filter(Usuario::isAtivo);
    }

    private SessaoResponse abrirSessao(Usuario usuario) {
        return SessaoResponse.de(tokens.emitir(usuario), UsuarioResponse.de(usuario));
    }

    private static ResponseStatusException naoAutorizado(String motivo) {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, motivo);
    }
}
