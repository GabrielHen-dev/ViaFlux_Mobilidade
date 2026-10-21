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
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

@SpringBootTest
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
        assertThat(appliedMigrations).isEqualTo(13);
        assertThat(latestVersion).isEqualTo("13");
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
                        .with(tokenPerfil(criarUsuarioDeTeste("Admin de teste"), "ADMIN"))
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
    void ticketGoesThroughTriageBeforeReachingTheDepartmentQueue() throws Exception {
        UUID cliente = criarClienteDeTeste();
        UUID atendente = criarUsuarioDeTeste("Atendente de teste");
        UUID manutencao = criarUsuarioDoDepartamento("MANUTENCAO");
        UUID tecnologia = criarUsuarioDoDepartamento("TI");

        String resposta = mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(cliente))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("Aberto"))
                .andExpect(jsonPath("$.prioridade").isEmpty())
                .andExpect(jsonPath("$.sla").isEmpty())
                .andExpect(jsonPath("$.triagem.prazoMinutos").value(10))
                .andExpect(jsonPath("$.motivo.id").value("M-MANUTENCAO-1"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String codigo = objectMapper.readTree(resposta).get("id").asText();

        mockMvc.perform(get("/api/chamados").with(tokenPerfil(manutencao, "DEPARTAMENTO")).queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/chamados/{codigo}", codigo).with(tokenPerfil(manutencao, "DEPARTAMENTO")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/chamados")
                        .with(tokenPerfil(atendente, "ATENDENTE"))
                        .queryParam("busca", codigo)
                        .queryParam("etapa", "TRIAGEM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(patch("/api/chamados/{codigo}/status", codigo)
                        .with(tokenPerfil(atendente, "ATENDENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Em atendimento\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/chamados/{codigo}/triagem/inicio", codigo).with(tokenPerfil(atendente, "ATENDENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Em triagem"))
                .andExpect(jsonPath("$.triagem.responsavel.nome").value("Atendente de teste"));
        mockMvc.perform(post("/api/chamados/{codigo}/triagem", codigo)
                        .with(tokenPerfil(atendente, "ATENDENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"MANUTENCAO\",\"severidade\":3,\"urgencia\":3,\"departamento\":\"MANUTENCAO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Na fila"))
                .andExpect(jsonPath("$.prioridade").value("P3"))
                .andExpect(jsonPath("$.departamento.codigo").value("MANUTENCAO"))
                .andExpect(jsonPath("$.sla.primeiraResposta.limite").exists());

        mockMvc.perform(get("/api/chamados").with(tokenPerfil(manutencao, "DEPARTAMENTO")).queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/chamados/{codigo}", codigo).with(tokenPerfil(tecnologia, "DEPARTAMENTO")))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/chamados/{codigo}/status", codigo)
                        .with(tokenPerfil(manutencao, "DEPARTAMENTO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Em atendimento\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Em atendimento"));

        mockMvc.perform(get("/api/chamados/{codigo}", codigo).with(tokenCliente(cliente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Em atendimento"))
                .andExpect(jsonPath("$.timeline[?(@.tipo == 'CLASSIFICACAO')]").isEmpty())
                .andExpect(jsonPath("$.timeline[?(@.tipo == 'ROTEAMENTO')]").isNotEmpty());
        mockMvc.perform(get("/api/chamados/{codigo}", codigo).with(tokenPerfil(atendente, "ATENDENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeline[*].acao").value(contains(
                        "Chamado aberto",
                        "Aguardando triagem",
                        "Triagem iniciada",
                        "Triagem concluída",
                        "Encaminhado para Manutenção",
                        "Cliente notificado",
                        "Status alterado para Em atendimento",
                        "Cliente notificado")));
        mockMvc.perform(get("/api/notificacoes").with(tokenCliente(cliente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].chamadoId").value(everyItem(is(codigo))))
                .andExpect(jsonPath("$[*].novoStatus").value(containsInAnyOrder("Na fila", "Em atendimento")));
    }

    private UUID criarClienteDeTeste() {
        return criarUsuarioDeTeste("Cliente de teste");
    }

    private UUID criarUsuarioDeTeste(String nome) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO viaflux.usuario (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)",
                id, nome, id + "@exemplo.com", "hash-de-teste"
        );
        return id;
    }

    private UUID criarUsuarioDoDepartamento(String departamento) {
        UUID id = criarUsuarioDeTeste("Equipe " + departamento);
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
