package br.com.viaflux.api.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI viafluxOpenApi() {
        return new OpenAPI().info(new Info()
                .title("ViaFlux Mobilidade API")
                .description("API da plataforma de gerenciamento de chamados da ViaFlux Mobilidade.")
                .version("v1"));
    }
}
