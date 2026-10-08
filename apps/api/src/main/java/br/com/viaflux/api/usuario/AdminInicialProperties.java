package br.com.viaflux.api.usuario;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties("viaflux.admin")
public record AdminInicialProperties(String email, String senha) {

    public boolean configurado() {
        return StringUtils.hasText(email) && StringUtils.hasText(senha);
    }
}
