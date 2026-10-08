package br.com.viaflux.api.auth;

import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.Usuario;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
class TokenService {

    record TokensEmitidos(String accessToken, String refreshToken, Duration validadeDoAccessToken) {
    }

    private final JwtEncoder encoder;
    private final JwtDecoder decodificadorDeRenovacao;
    private final JwtProperties propriedades;

    TokenService(JwtEncoder encoder, SecretKey chaveDeAssinaturaJwt, JwtProperties propriedades) {
        this.encoder = encoder;
        this.decodificadorDeRenovacao = JwtConfig.decodificadorDeTokens(chaveDeAssinaturaJwt, JwtConfig.TIPO_RENOVACAO);
        this.propriedades = propriedades;
    }

    TokensEmitidos emitir(Usuario usuario) {
        Instant agora = Instant.now();
        List<String> perfis = usuario.getPerfis().stream().map(Perfil::getCodigo).sorted().toList();

        JwtClaimsSet acesso = claimsBase(usuario, agora, propriedades.accessTtl())
                .claim(JwtConfig.CLAIM_TIPO, JwtConfig.TIPO_ACESSO)
                .claim(JwtConfig.CLAIM_PERFIS, perfis)
                .build();
        JwtClaimsSet renovacao = claimsBase(usuario, agora, propriedades.refreshTtl())
                .claim(JwtConfig.CLAIM_TIPO, JwtConfig.TIPO_RENOVACAO)
                .build();

        return new TokensEmitidos(assinar(acesso), assinar(renovacao), propriedades.accessTtl());
    }

    Optional<UUID> usuarioDoRefreshToken(String refreshToken) {
        try {
            return Optional.of(UUID.fromString(decodificadorDeRenovacao.decode(refreshToken).getSubject()));
        } catch (JwtException | IllegalArgumentException tokenInvalido) {
            return Optional.empty();
        }
    }

    private JwtClaimsSet.Builder claimsBase(Usuario usuario, Instant emitidoEm, Duration validade) {
        return JwtClaimsSet.builder()
                .issuer(JwtConfig.EMISSOR)
                .subject(usuario.getId().toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(emitidoEm)
                .expiresAt(emitidoEm.plus(validade));
    }

    private String assinar(JwtClaimsSet claims) {
        JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(cabecalho, claims)).getTokenValue();
    }
}
