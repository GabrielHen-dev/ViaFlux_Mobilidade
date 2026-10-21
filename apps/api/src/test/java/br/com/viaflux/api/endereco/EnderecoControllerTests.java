package br.com.viaflux.api.endereco;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EnderecoController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class EnderecoControllerTests {

    private static final EnderecoResponse PAULISTA = new EnderecoResponse(
            "Avenida Paulista, 1500 · Bela Vista · São Paulo – SP", "01310-200", "Avenida Paulista", "1500",
            "Bela Vista", "São Paulo", "SP", -23.56141, -46.65588);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EnderecoService enderecoService;

    @Test
    void rejectsLookupWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/enderecos/cep/01310100"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsAddressForCepWithOrWithoutHyphen() throws Exception {
        given(enderecoService.buscarPorCep("01310100")).willReturn(Optional.of(PAULISTA));

        mockMvc.perform(get("/api/enderecos/cep/01310-100").with(autenticado("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cep").value("01310-200"))
                .andExpect(jsonPath("$.logradouro").value("Avenida Paulista"))
                .andExpect(jsonPath("$.bairro").value("Bela Vista"))
                .andExpect(jsonPath("$.cidade").value("São Paulo"))
                .andExpect(jsonPath("$.uf").value("SP"))
                .andExpect(jsonPath("$.descricao").value(PAULISTA.descricao()));
    }

    @Test
    void rejectsCepWithoutEightDigits() throws Exception {
        mockMvc.perform(get("/api/enderecos/cep/1234").with(autenticado("CLIENTE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Informe um CEP com 8 dígitos."));

        verifyNoInteractions(enderecoService);
    }

    @Test
    void answersNotFoundForUnknownCep() throws Exception {
        given(enderecoService.buscarPorCep("99999999")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/enderecos/cep/99999999").with(autenticado("CLIENTE")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("CEP não encontrado."));
    }

    @Test
    void returnsAddressForCoordinates() throws Exception {
        given(enderecoService.buscarPorCoordenadas(new Coordenadas(-23.561414, -46.655881)))
                .willReturn(Optional.of(PAULISTA));

        mockMvc.perform(get("/api/enderecos/reverso")
                        .param("latitude", "-23.561414")
                        .param("longitude", "-46.655881")
                        .with(autenticado("GESTOR_FROTA")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numero").value("1500"))
                .andExpect(jsonPath("$.latitude").value(-23.56141));
    }

    @Test
    void rejectsCoordinatesOutOfRange() throws Exception {
        mockMvc.perform(get("/api/enderecos/reverso")
                        .param("latitude", "91")
                        .param("longitude", "-46.6")
                        .with(autenticado("CLIENTE")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/enderecos/reverso")
                        .param("latitude", "-23.5")
                        .with(autenticado("CLIENTE")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(enderecoService);
    }

    @Test
    void answersNotFoundWhenCoordinatesHaveNoAddress() throws Exception {
        given(enderecoService.buscarPorCoordenadas(any(Coordenadas.class))).willReturn(Optional.empty());

        mockMvc.perform(get("/api/enderecos/reverso")
                        .param("latitude", "-10")
                        .param("longitude", "-30")
                        .with(autenticado("CLIENTE")))
                .andExpect(status().isNotFound());
    }

    @Test
    void searchesStreetsNearTheGivenCoordinates() throws Exception {
        given(enderecoService.buscar(eq("Avenida Paulista"), eq(new Coordenadas(-23.56, -46.66))))
                .willReturn(List.of(PAULISTA));

        mockMvc.perform(get("/api/enderecos/busca")
                        .param("q", " Avenida Paulista ")
                        .param("latitude", "-23.56")
                        .param("longitude", "-46.66")
                        .with(autenticado("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].logradouro").value("Avenida Paulista"))
                .andExpect(jsonPath("$[0].cidade").value("São Paulo"));
    }

    @Test
    void searchesStreetsWithoutCoordinates() throws Exception {
        given(enderecoService.buscar(eq("Rua Augusta"), isNull())).willReturn(List.of());

        mockMvc.perform(get("/api/enderecos/busca").param("q", "Rua Augusta").with(autenticado("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectsSearchShorterThanThreeCharacters() throws Exception {
        mockMvc.perform(get("/api/enderecos/busca").param("q", " ab ").with(autenticado("CLIENTE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Digite pelo menos 3 caracteres para buscar o endereço."));

        verifyNoInteractions(enderecoService);
    }

    @Test
    void answersServiceUnavailableWhenUpstreamFails() throws Exception {
        given(enderecoService.buscar(anyString(), any()))
                .willThrow(new ServicoDeEnderecosIndisponivelException(null));

        mockMvc.perform(get("/api/enderecos/busca").param("q", "Rua Augusta").with(autenticado("CLIENTE")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value(ServicoDeEnderecosIndisponivelException.MENSAGEM));
    }

    private static RequestPostProcessor autenticado(String perfil) {
        return jwt()
                .jwt(token -> token.subject(UUID.randomUUID().toString()).claim("perfis", List.of(perfil)))
                .authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
