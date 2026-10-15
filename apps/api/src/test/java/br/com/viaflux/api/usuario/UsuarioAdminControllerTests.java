package br.com.viaflux.api.usuario;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UsuarioAdminController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class UsuarioAdminControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioAdminService service;

    @Test
    void requiresAuthenticationForUserAdministration() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ATENDENTE")
    void restrictsUserAdministrationToAdministrators() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void listsUsersForAdministrator() throws Exception {
        given(service.listar(0, 20)).willReturn(new UsuariosAdminPageResponse(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createsUserAndReturnsLocation() throws Exception {
        UUID id = UUID.randomUUID();
        given(service.criar(any(CriarUsuarioRequest.class))).willReturn(new UsuarioAdminResponse(
                id, "Maria Silva", "maria@example.com", true,
                List.of(new UsuarioResponse.PerfilResponse("CLIENTE", "Cliente")), null, List.of()
        ));

        mockMvc.perform(post("/api/admin/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nome":"Maria Silva",
                                  "email":"maria@example.com",
                                  "senha":"senha-segura-123",
                                  "perfis":["CLIENTE"],
                                  "departamentos":[]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/admin/usuarios/" + id))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void validatesRequiredUserFields() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"","email":"invalido","senha":"123","perfis":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nome").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.senha").exists())
                .andExpect(jsonPath("$.errors.perfis").exists());
    }
}
