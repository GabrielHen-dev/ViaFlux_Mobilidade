package br.com.viaflux.api.usuario;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UsuarioAdminController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class UsuarioAdminControllerTests {

    private static final UUID ADMIN = UUID.randomUUID();

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
    void invitesUserWithoutPasswordAndReturnsLocation() throws Exception {
        UUID id = UUID.randomUUID();
        given(service.criar(any(CriarUsuarioRequest.class), eq(ADMIN))).willReturn(usuarioPendente(id));

        mockMvc.perform(post("/api/admin/usuarios")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nome":"Maria Silva",
                                  "email":"maria@example.com",
                                  "perfis":["ATENDENTE","LIDER_OPERACIONAL"],
                                  "departamentos":[]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/admin/usuarios/" + id))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.convitePendente").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void validatesRequiredUserFields() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"","email":"invalido","perfis":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nome").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.perfis").exists());
    }

    @Test
    void resendsPendingInvitation() throws Exception {
        UUID id = UUID.randomUUID();
        given(service.reenviarConvite(id, ADMIN)).willReturn(usuarioPendente(id));

        mockMvc.perform(post("/api/admin/usuarios/{id}/convite", id).with(admin()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.convitePendente").value(true));
        then(service).should().reenviarConvite(id, ADMIN);
    }

    @Test
    void resendingInvitationOfActivatedUserResponds409() throws Exception {
        UUID id = UUID.randomUUID();
        given(service.reenviarConvite(id, ADMIN))
                .willThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Este usuário já ativou o acesso."));

        mockMvc.perform(post("/api/admin/usuarios/{id}/convite", id).with(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Este usuário já ativou o acesso."));
    }

    @Test
    void restrictsInvitationResendToAdministrators() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios/{id}/convite", UUID.randomUUID())
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ATENDENTE"))))
                .andExpect(status().isForbidden());
    }

    private static JwtRequestPostProcessor admin() {
        return jwt().jwt(token -> token.subject(ADMIN.toString())).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static UsuarioAdminResponse usuarioPendente(UUID id) {
        return new UsuarioAdminResponse(
                id, "Maria Silva", "maria@example.com", true, true,
                List.of(new UsuarioResponse.PerfilResponse("ATENDENTE", "Atendente")), null, List.of()
        );
    }
}
