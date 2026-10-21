package br.com.viaflux.api.endereco;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.twice;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.GET;

class EnderecoServiceTests {

    private static final String NOMINATIM = "https://nominatim.teste";
    private static final String VIACEP = "https://viacep.teste";

    private static final String REVERSO_PAULISTA = """
            {
              "lat": "-23.5614",
              "lon": "-46.6558",
              "display_name": "1500, Avenida Paulista, Bela Vista, São Paulo, Brasil",
              "address": {
                "house_number": "1500",
                "road": "Avenida Paulista",
                "suburb": "Bela Vista",
                "city": "São Paulo",
                "state": "São Paulo",
                "ISO3166-2-lvl4": "BR-SP",
                "postcode": "01310-200",
                "country_code": "br"
              }
            }
            """;

    private MockRestServiceServer servidor;
    private EnderecoService servico;
    private RelogioAjustavel relogio;
    private final AtomicLong agoraEmNanos = new AtomicLong();
    private final List<Long> esperasEmNanos = new ArrayList<>();

    @BeforeEach
    void preparar() {
        RestClient.Builder construtor = RestClient.builder();
        servidor = MockRestServiceServer.bindTo(construtor).build();
        relogio = new RelogioAjustavel(Instant.parse("2026-10-20T12:00:00Z"));
        LimitadorDeRequisicoes limitador = new LimitadorDeRequisicoes(Duration.ofSeconds(1), agoraEmNanos::get, nanos -> {
            esperasEmNanos.add(nanos);
            agoraEmNanos.addAndGet(nanos);
        });
        servico = new EnderecoService(construtor.build(), new EnderecoProperties(NOMINATIM, VIACEP, null), limitador, relogio);
    }

    @Test
    void fillsAddressFromViaCep() {
        servidor.expect(requestTo(VIACEP + "/ws/01310100/json/"))
                .andExpect(method(GET))
                .andRespond(withSuccess("""
                        {"cep":"01310-100","logradouro":"Avenida Paulista","complemento":"de 612 a 1510 - lado par",
                         "bairro":"Bela Vista","localidade":"São Paulo","uf":"SP","estado":"São Paulo"}
                        """, MediaType.APPLICATION_JSON));

        Optional<EnderecoResponse> endereco = servico.buscarPorCep("01310100");

        servidor.verify();
        assertThat(endereco).contains(new EnderecoResponse(
                "Avenida Paulista · Bela Vista · São Paulo – SP", "01310-100", "Avenida Paulista", "",
                "Bela Vista", "São Paulo", "SP", null, null));
        assertThat(esperasEmNanos).isEmpty();
    }

    @Test
    void returnsEmptyWhenViaCepDoesNotKnowTheCep() {
        servidor.expect(requestTo(VIACEP + "/ws/99999999/json/"))
                .andRespond(withSuccess("{\"erro\": true}", MediaType.APPLICATION_JSON));

        assertThat(servico.buscarPorCep("99999999")).isEmpty();
    }

    @Test
    void cachesCepLookups() {
        servidor.expect(once(), requestTo(VIACEP + "/ws/01310100/json/"))
                .andRespond(withSuccess("{\"cep\":\"01310-100\",\"localidade\":\"São Paulo\",\"uf\":\"SP\"}",
                        MediaType.APPLICATION_JSON));

        servico.buscarPorCep("01310100");
        Optional<EnderecoResponse> segunda = servico.buscarPorCep("01310100");

        servidor.verify();
        assertThat(segunda).map(EnderecoResponse::cidade).contains("São Paulo");
    }

    @Test
    void fillsAddressFromCoordinatesWithNominatim() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/reverse")))
                .andExpect(queryParam("format", "jsonv2"))
                .andExpect(queryParam("addressdetails", "1"))
                .andExpect(queryParam("lat", "-23.56141"))
                .andExpect(queryParam("lon", "-46.65588"))
                .andExpect(queryParam("accept-language", "pt-BR"))
                .andRespond(withSuccess(REVERSO_PAULISTA, MediaType.APPLICATION_JSON));

        Optional<EnderecoResponse> endereco = servico.buscarPorCoordenadas(new Coordenadas(-23.561414, -46.655881));

        servidor.verify();
        assertThat(endereco).contains(new EnderecoResponse(
                "Avenida Paulista, 1500 · Bela Vista · São Paulo – SP", "01310-200", "Avenida Paulista", "1500",
                "Bela Vista", "São Paulo", "SP", -23.56141, -46.65588));
    }

    @Test
    void usesFallbackFieldsAndStateNameWhenNominatimHasNoRoadOrIsoCode() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withSuccess("""
                        {"display_name":"Rodovia Presidente Dutra, Queluz",
                         "address":{"highway":"Rodovia Presidente Dutra","neighbourhood":"Centro",
                                    "town":"Queluz","state":"Espírito Santo","postcode":"12800"}}
                        """, MediaType.APPLICATION_JSON));

        EnderecoResponse endereco = servico.buscarPorCoordenadas(new Coordenadas(-22.5, -44.7)).orElseThrow();

        assertThat(endereco.logradouro()).isEqualTo("Rodovia Presidente Dutra");
        assertThat(endereco.bairro()).isEqualTo("Centro");
        assertThat(endereco.cidade()).isEqualTo("Queluz");
        assertThat(endereco.uf()).isEqualTo("ES");
        assertThat(endereco.cep()).isEmpty();
        assertThat(endereco.numero()).isEmpty();
    }

    @Test
    void returnsEmptyWhenNominatimCannotGeocode() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withSuccess("{\"error\":\"Unable to geocode\"}", MediaType.APPLICATION_JSON));

        assertThat(servico.buscarPorCoordenadas(new Coordenadas(-10, -30))).isEmpty();
    }

    @Test
    void cachesReverseLookupsByCoordinatesRoundedToFiveDecimals() {
        servidor.expect(once(), requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withSuccess(REVERSO_PAULISTA, MediaType.APPLICATION_JSON));

        servico.buscarPorCoordenadas(new Coordenadas(-23.5614141, -46.6558811));
        servico.buscarPorCoordenadas(new Coordenadas(-23.5614139, -46.6558809));

        servidor.verify();
    }

    @Test
    void fetchesAgainAfterTheCacheExpires() {
        servidor.expect(twice(), requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withSuccess(REVERSO_PAULISTA, MediaType.APPLICATION_JSON));

        servico.buscarPorCoordenadas(new Coordenadas(-23.56141, -46.65588));
        relogio.avancar(EnderecoService.VALIDADE_DO_CACHE.plusSeconds(1));
        servico.buscarPorCoordenadas(new Coordenadas(-23.56141, -46.65588));

        servidor.verify();
    }

    @Test
    void searchesStreetsBiasedAroundTheGivenCoordinatesWithoutBoundingThem() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/search")))
                .andExpect(queryParam("q", "Avenida%20Paulista"))
                .andExpect(queryParam("countrycodes", "br"))
                .andExpect(queryParam("limit", "5"))
                .andExpect(queryParam("viewbox", "-47.2,-23.1,-46.2,-24.1"))
                .andExpect(requisicao -> assertThat(requisicao.getURI().getRawQuery()).doesNotContain("bounded"))
                .andRespond(withSuccess("[" + REVERSO_PAULISTA + "," + REVERSO_PAULISTA + """
                        ,{"lat":"-22.9","lon":"-43.2","display_name":"Avenida Paulista, Rio",
                          "address":{"road":"Avenida Paulista","city":"Rio de Janeiro","state":"Rio de Janeiro"}}]
                        """, MediaType.APPLICATION_JSON));

        List<EnderecoResponse> sugestoes = servico.buscar("  Avenida   Paulista ", new Coordenadas(-23.56, -46.66));

        servidor.verify();
        assertThat(sugestoes).extracting(EnderecoResponse::descricao).containsExactly(
                "Avenida Paulista, 1500 · Bela Vista · São Paulo – SP",
                "Avenida Paulista · Rio de Janeiro – RJ");
        assertThat(sugestoes.get(0).latitude()).isEqualTo(-23.5614);
        assertThat(sugestoes.get(0).longitude()).isEqualTo(-46.6558);
    }

    @Test
    void searchesWithoutViewboxWhenCoordinatesAreUnknown() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/search")))
                .andExpect(requisicao -> assertThat(requisicao.getURI().getRawQuery()).doesNotContain("viewbox"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(servico.buscar("Rua das Flores", null)).isEmpty();
        servidor.verify();
    }

    @Test
    void waitsOneSecondBetweenNominatimRequests() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withSuccess(REVERSO_PAULISTA, MediaType.APPLICATION_JSON));
        servidor.expect(requestTo(startsWith(NOMINATIM + "/search")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        servico.buscarPorCoordenadas(new Coordenadas(-23.56141, -46.65588));
        servico.buscar("Rua Augusta", null);

        servidor.verify();
        assertThat(esperasEmNanos).containsExactly(Duration.ofSeconds(1).toNanos());
    }

    @Test
    void reportsUnavailableServiceWhenUpstreamFails() {
        servidor.expect(requestTo(VIACEP + "/ws/01310100/json/")).andRespond(withServerError());

        assertThatThrownBy(() -> servico.buscarPorCep("01310100"))
                .isInstanceOf(ServicoDeEnderecosIndisponivelException.class);
    }

    @Test
    void reportsUnavailableServiceWhenUpstreamTimesOut() {
        servidor.expect(requestTo(startsWith(NOMINATIM + "/reverse")))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThatThrownBy(() -> servico.buscarPorCoordenadas(new Coordenadas(-23.5, -46.6)))
                .isInstanceOf(ServicoDeEnderecosIndisponivelException.class);
    }

    private static final class RelogioAjustavel extends Clock {

        private Instant agora;

        private RelogioAjustavel(Instant inicio) {
            this.agora = inicio;
        }

        void avancar(Duration intervalo) {
            agora = agora.plus(intervalo);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }
}
