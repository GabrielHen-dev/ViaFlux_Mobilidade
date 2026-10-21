package br.com.viaflux.api.chamado;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.nio.file.Path;
import java.util.Set;

@ConfigurationProperties(prefix = "viaflux.anexos")
record AnexosProperties(
        @DefaultValue("./data/anexos") Path diretorio,
        @DefaultValue("10") int limiteMb
) {

    static final Set<String> TIPOS_PERMITIDOS = Set.of("image/png", "image/jpeg", "application/pdf");

    long limiteBytes() {
        return limiteMb * 1024L * 1024L;
    }
}
