package br.com.viaflux.api.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {

    static final String EMISSOR = "viaflux-api";
    static final String CLAIM_TIPO = "tipo";
    static final String CLAIM_PERFIS = "perfis";
    static final String TIPO_ACESSO = "acesso";
    static final String TIPO_RENOVACAO = "renovacao";

    private static final int TAMANHO_MINIMO_DO_SEGREDO_EM_BYTES = 32;

    @Bean
    SecretKey chaveDeAssinaturaJwt(JwtProperties propriedades) {
        String segredo = propriedades.secret() == null ? "" : propriedades.secret();
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < TAMANHO_MINIMO_DO_SEGREDO_EM_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET precisa ter ao menos 32 bytes. Gere um valor com: openssl rand -base64 48");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey chave) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(chave));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey chave) {
        return decodificadorDeTokens(chave, TIPO_ACESSO);
    }

    @Bean
    JwtAuthenticationConverter perfisComoAutoridades() {
        JwtGrantedAuthoritiesConverter perfis = new JwtGrantedAuthoritiesConverter();
        perfis.setAuthoritiesClaimName(CLAIM_PERFIS);
        perfis.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter conversor = new JwtAuthenticationConverter();
        conversor.setJwtGrantedAuthoritiesConverter(perfis);
        return conversor;
    }

    static JwtDecoder decodificadorDeTokens(SecretKey chave, String tipoAceito) {
        NimbusJwtDecoder decodificador = NimbusJwtDecoder.withSecretKey(chave)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decodificador.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(EMISSOR),
                new JwtClaimValidator<String>(CLAIM_TIPO, tipoAceito::equals)
        ));
        return decodificador;
    }
}
