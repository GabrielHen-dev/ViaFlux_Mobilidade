package br.com.viaflux.api.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI viafluxOpenApi() {
        return new OpenAPI()
                .components(new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .info(new Info()
                .title("ViaFlux Mobilidade API")
                .description("""
                        API da plataforma de chamados da ViaFlux Mobilidade.

                        Ciclo do chamado: o cliente abre (Aberto) → o atendente faz a triagem (Em triagem) → o chamado entra na fila do \
                        departamento (Na fila) → o departamento assume (Em atendimento) → Aguardando, Resolvido e Fechado.

                        Perfis: CLIENTE e GESTOR_FROTA abrem e acompanham os próprios chamados; ATENDENTE faz a triagem e apoia a Central \
                        (transfere, aciona fornecedor e usa a lixeira); DEPARTAMENTO assume e resolve os chamados da própria fila; \
                        LIDER_OPERACIONAL acompanha tudo e vê as métricas, sem alterar; FORNECEDOR atualiza os serviços acionados; \
                        ADMIN faz tudo e cadastra usuários.

                        Autenticação: entre em POST /auth/login e use o accessToken no botão Authorize (Bearer).
                        """)
                .version("v1"));
    }
}
