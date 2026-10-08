package br.com.viaflux.api.shared.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenApiConfigTests {

    private final OpenApiConfig openApiConfig = new OpenApiConfig();

    @Test
    void providesViafluxApiMetadata() {
        var info = openApiConfig.viafluxOpenApi().getInfo();

        assertThat(info.getTitle()).isEqualTo("ViaFlux Mobilidade API");
        assertThat(info.getVersion()).isEqualTo("v1");
    }
}
