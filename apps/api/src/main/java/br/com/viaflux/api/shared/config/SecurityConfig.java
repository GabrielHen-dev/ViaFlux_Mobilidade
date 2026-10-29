package br.com.viaflux.api.shared.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import br.com.viaflux.api.auth.JwtConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.ProblemDetail;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(CorsProperties.class)
@Import(JwtConfig.class)
public class SecurityConfig {

    private static final String[] PERFIS_DA_CENTRAL = {"ADMIN", "ATENDENTE", "DEPARTAMENTO", "LIDER_OPERACIONAL"};
    private static final String[] PERFIS_DE_TRIAGEM = {"ADMIN", "ATENDENTE"};
    private static final String[] PERFIS_DA_LIXEIRA = {"ADMIN", "ATENDENTE"};
    private static final String[] PERFIS_QUE_CONDUZEM = {"ADMIN", "ATENDENTE", "DEPARTAMENTO"};
    private static final String[] PERFIS_QUE_ATENDEM = {"ADMIN", "ATENDENTE", "DEPARTAMENTO"};
    private static final String[] PERFIS_DE_METRICAS = {"ADMIN", "LIDER_OPERACIONAL"};
    private static final String[] PERFIS_QUE_ABREM_CHAMADO = {"CLIENTE", "GESTOR_FROTA", "ADMIN", "ATENDENTE"};
    private static final String[] PERFIS_DE_SOLICITANTE = {"CLIENTE", "GESTOR_FROTA"};
    private static final String[] PERFIS_COM_ACESSO_A_CHAMADOS = {
            "ADMIN", "ATENDENTE", "DEPARTAMENTO", "LIDER_OPERACIONAL", "CLIENTE", "GESTOR_FROTA"
    };

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler,
            JwtAuthenticationConverter perfisComoAutoridades
    ) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/login", "/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/cadastro", "/auth/verificacao", "/auth/verificacao/reenvio",
                                "/auth/senha/recuperacao", "/auth/senha/redefinicao").permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/me").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/dev/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/enderecos/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/classificacao/**", "/api/departamentos").authenticated()
                        .requestMatchers("/api/notificacoes", "/api/notificacoes/**").authenticated()
                        .requestMatchers("/api/fornecedor/**").hasRole("FORNECEDOR")
                        .requestMatchers(HttpMethod.GET, "/api/fornecedores").hasAnyRole(PERFIS_QUE_CONDUZEM)
                        .requestMatchers(HttpMethod.GET, "/api/metricas", "/api/metricas/**").hasAnyRole(PERFIS_DE_METRICAS)
                        .requestMatchers(HttpMethod.GET, "/api/solicitantes").hasAnyRole("ADMIN", "ATENDENTE", "GESTOR_FROTA")
                        .requestMatchers(HttpMethod.POST, "/api/chamados").hasAnyRole(PERFIS_QUE_ABREM_CHAMADO)
                        .requestMatchers("/api/chamados/lixeira", "/api/chamados/lixeira/**").hasAnyRole(PERFIS_DA_LIXEIRA)
                        .requestMatchers(HttpMethod.DELETE, "/api/chamados/*").hasAnyRole(PERFIS_DA_LIXEIRA)
                        .requestMatchers(HttpMethod.POST, "/api/chamados/*/restauracao").hasAnyRole(PERFIS_DA_LIXEIRA)
                        .requestMatchers(HttpMethod.GET, "/api/chamados/resumo").hasAnyRole(PERFIS_DA_CENTRAL)
                        .requestMatchers("/api/chamados/*/triagem", "/api/chamados/*/triagem/**").hasAnyRole(PERFIS_DE_TRIAGEM)
                        .requestMatchers("/api/chamados/*/classificacao", "/api/chamados/*/override").hasAnyRole(PERFIS_DE_TRIAGEM)
                        .requestMatchers(HttpMethod.PATCH, "/api/chamados/*/status").hasAnyRole(PERFIS_QUE_ATENDEM)
                        .requestMatchers(HttpMethod.POST, "/api/chamados/*/atendimento").hasAnyRole(PERFIS_QUE_ATENDEM)
                        .requestMatchers(HttpMethod.POST, "/api/chamados/*/transferencias").hasAnyRole(PERFIS_QUE_CONDUZEM)
                        .requestMatchers(HttpMethod.POST, "/api/chamados/*/resolucao/**", "/api/chamados/*/reabertura").hasAnyRole(PERFIS_DE_SOLICITANTE)
                        .requestMatchers("/api/chamados/*/servicos", "/api/chamados/*/servicos/*").hasAnyRole(PERFIS_QUE_CONDUZEM)
                        .requestMatchers("/api/chamados", "/api/chamados/**").hasAnyRole(PERFIS_COM_ACESSO_A_CHAMADOS)
                        .anyRequest().denyAll())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(perfisComoAutoridades)))
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Idempotency-Key"));
        configuration.setExposedHeaders(List.of("Content-Disposition", "Location"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint(ObjectMapper objectMapper) {
        return (request, response, exception) -> writeProblem(
                response,
                objectMapper,
                HttpStatus.UNAUTHORIZED,
                "Autenticação é necessária para acessar este recurso."
        );
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, exception) -> writeProblem(
                response,
                objectMapper,
                HttpStatus.FORBIDDEN,
                "Você não tem permissão para acessar este recurso."
        );
    }

    private static void writeProblem(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            HttpStatus status,
            String detail
    ) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
