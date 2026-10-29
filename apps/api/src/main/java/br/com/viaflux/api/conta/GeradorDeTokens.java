package br.com.viaflux.api.conta;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Component
class GeradorDeTokens {

    private static final int BYTES_DO_TOKEN = 32;

    private final SecureRandom aleatorio = new SecureRandom();

    String novoToken() {
        byte[] bytes = new byte[BYTES_DO_TOKEN];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    String hash(String token) {
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException semSha256) {
            throw new IllegalStateException("SHA-256 indisponível na JVM.", semSha256);
        }
    }
}
