package br.com.viaflux.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

@SpringBootTest(properties = "management.health.mail.enabled=false")
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class ViafluxApplicationTests {

    private static final String CORPO_DE_ABERTURA = """
            {
              "motivoId":"M-MANUTENCAO-1",
              "contextoId":"C-MANUTENCAO-1",
              "descricao":"Freio falhando na descida da serra",
              "cliente":"Cliente A",
              "modelo":"Volvo FH",
              "localizacao":{"endereco":"BR-116, km 312"}
            }
            """;

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoads() {
        assertThat(postgres.isRunning()).isTrue();
    }

    @Test
    void connectsToPostgresAndAppliesAllMigrationsUpToTheCompleteTicketFlow() {
        Boolean schemaExists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'viaflux')",
                Boolean.class
        );
        Integer appliedMigrations = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.flyway_schema_history WHERE version IS NOT NULL AND success = TRUE",
                Integer.class
        );
        String latestVersion = jdbcTemplate.queryForObject(
                "SELECT version FROM public.flyway_schema_history WHERE success = TRUE ORDER BY installed_rank DESC LIMIT 1",
                String.class
        );
        Integer reasons = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM viaflux.motivo", Integer.class);
        Integer contexts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM viaflux.contexto", Integer.class);

        assertThat(schemaExists).isTrue();
        assertThat(appliedMigrations).isEqualTo(18);
        assertThat(latestVersion).isEqualTo("18");
        assertThat(reasons).isEqualTo(30);
        assertThat(contexts).isEqualTo(30);
    }

    @Test
    void healthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void blocksBusinessPathsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/chamados"))
                .andExpect(status().isUnauthorized())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void openApiDocumentationIsPublic() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("ViaFlux Mobilidade API"))
                .andExpect(jsonPath("$.info.version").value("v1"));
    }

    @Test
    void rejectsTicketOpeningWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsValidTokenOfUnknownUser() throws Exception {
        mockMvc.perform(get("/api/chamados").with(tokenPerfil(UUID.randomUUID(), "DEPARTAMENTO")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerCanOnlyListAndConsultOwnTickets() throws Exception {
        UUID primeiroCliente = criarClienteDeTeste();
        UUID segundoCliente = criarClienteDeTeste();

        String resposta = mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(primeiroCliente))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode chamado = objectMapper.readTree(resposta);
        String codigo = chamado.get("id").asText();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT solicitante_id FROM viaflux.chamados WHERE codigo = ?", UUID.class, codigo
        )).isEqualTo(primeiroCliente);

        mockMvc.perform(get("/api/chamados")
                        .with(tokenCliente(primeiroCliente))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/chamados")
                        .with(tokenCliente(segundoCliente))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(get("/api/chamados")
                        .with(tokenPerfil(criarUsuarioDeTeste("Admin de teste", "ADMIN"), "ADMIN"))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/chamados/{codigo}", codigo)
                        .with(tokenCliente(segundoCliente)))
                .andExpect(status().isNotFound());
    }

    @Test
    void repeatedOpeningWithTheSameIdempotencyKeyReturnsTheSameTicket() throws Exception {
        UUID cliente = criarClienteDeTeste();

        String primeira = mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(cliente))
                        .header("Idempotency-Key", "abertura-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String codigo = objectMapper.readTree(primeira).get("id").asText();

        mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(cliente))
                        .header("Idempotency-Key", "abertura-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(codigo));

        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM viaflux.chamados WHERE solicitante_id = ?", Integer.class, cliente
        )).isEqualTo(1);
    }

    @Test
    void ticketIsClassifiedAndRoutedAutomaticallyAtOpening() throws Exception {
        UUID cliente = criarClienteDeTeste();
        UUID manutencao = criarUsuarioDoDepartamento("MANUTENCAO");
        UUID tecnologia = criarUsuarioDoDepartamento("TI");

        String resposta = mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(cliente))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.motivo.id").value("M-MANUTENCAO-1"))
                .andExpect(jsonPath("$.prioridade").value("P1"))
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.departamento.codigo").value("MANUTENCAO"))
                .andExpect(jsonPath("$.sla.primeiraResposta.limite").exists())
                .andReturn().getResponse().getContentAsString();
        String codigo = objectMapper.readTree(resposta).get("id").asText();

        mockMvc.perform(get("/api/chamados")
                        .with(tokenPerfil(manutencao, "DEPARTAMENTO"))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/chamados/{codigo}", codigo)
                        .with(tokenPerfil(tecnologia, "DEPARTAMENTO")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/chamados/{codigo}", codigo)
                        .with(tokenCliente(cliente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prioridade").value("P1"));
    }

    private UUID criarClienteDeTeste() {
        return criarUsuarioDeTeste("Cliente de teste", "CLIENTE");
    }

    private UUID criarUsuarioDeTeste(String nome, String perfil) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO viaflux.usuario (id, nome, email, senha_hash, email_verificado_em) VALUES (?, ?, ?, ?, now())",
                id, nome, id + "@exemplo.com", "hash-de-teste"
        );
        jdbcTemplate.update(
                "INSERT INTO viaflux.usuario_perfil (usuario_id, perfil_codigo) VALUES (?, ?)",
                id, perfil
        );
        return id;
    }

    private UUID criarUsuarioDoDepartamento(String departamento) {
        UUID id = criarUsuarioDeTeste("Equipe " + departamento, "DEPARTAMENTO");
        jdbcTemplate.update(
                "INSERT INTO viaflux.usuario_departamento (usuario_id, departamento_codigo) VALUES (?, ?)",
                id, departamento
        );
        return id;
    }

    private static RequestPostProcessor tokenCliente(UUID usuarioId) {
        return tokenPerfil(usuarioId, "CLIENTE");
    }

    private static RequestPostProcessor tokenPerfil(UUID usuarioId, String perfil) {
        return jwt()
                .jwt(token -> token.subject(usuarioId.toString()).claim("perfis", List.of(perfil)))
                .authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
