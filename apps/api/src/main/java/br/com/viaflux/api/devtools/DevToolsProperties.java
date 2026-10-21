package br.com.viaflux.api.devtools;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "viaflux.dev-tools")
public record DevToolsProperties(boolean habilitado, String senhaDosUsuarios) {

    boolean senhaConfigurada() {
        return senhaDosUsuarios != null && !senhaDosUsuarios.isBlank();
    }
}
