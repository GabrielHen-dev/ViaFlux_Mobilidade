package br.com.viaflux.api.endereco;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

class EnderecoService {

    static final int CAPACIDADE_DO_CACHE = 500;
    static final Duration VALIDADE_DO_CACHE = Duration.ofHours(6);

    private static final int CASAS_DECIMAIS_DO_REVERSO = 5;
    private static final int CASAS_DECIMAIS_DA_PROXIMIDADE = 1;
    private static final BigDecimal RAIO_DA_PROXIMIDADE_EM_GRAUS = new BigDecimal("0.5");
    private static final int LIMITE_DE_SUGESTOES = 5;
    private static final String IDIOMA = "pt-BR";

    private static final Map<String, String> UF_POR_NOME_DO_ESTADO = Map.ofEntries(
            Map.entry("acre", "AC"),
            Map.entry("alagoas", "AL"),
            Map.entry("amapa", "AP"),
            Map.entry("amazonas", "AM"),
            Map.entry("bahia", "BA"),
            Map.entry("ceara", "CE"),
            Map.entry("distrito federal", "DF"),
            Map.entry("espirito santo", "ES"),
            Map.entry("goias", "GO"),
            Map.entry("maranhao", "MA"),
            Map.entry("mato grosso", "MT"),
            Map.entry("mato grosso do sul", "MS"),
            Map.entry("minas gerais", "MG"),
            Map.entry("para", "PA"),
            Map.entry("paraiba", "PB"),
            Map.entry("parana", "PR"),
            Map.entry("pernambuco", "PE"),
            Map.entry("piaui", "PI"),
            Map.entry("rio de janeiro", "RJ"),
            Map.entry("rio grande do norte", "RN"),
            Map.entry("rio grande do sul", "RS"),
            Map.entry("rondonia", "RO"),
            Map.entry("roraima", "RR"),
            Map.entry("santa catarina", "SC"),
            Map.entry("sao paulo", "SP"),
            Map.entry("sergipe", "SE"),
            Map.entry("tocantins", "TO")
    );

    private final RestClient cliente;
    private final EnderecoProperties propriedades;
    private final LimitadorDeRequisicoes limitadorDoNominatim;
    private final CacheTemporario<Optional<EnderecoResponse>> cacheDeCep;
    private final CacheTemporario<Optional<EnderecoResponse>> cacheDeReverso;
    private final CacheTemporario<List<EnderecoResponse>> cacheDeBusca;

    EnderecoService(
            RestClient cliente,
            EnderecoProperties propriedades,
            LimitadorDeRequisicoes limitadorDoNominatim,
            Clock relogio
    ) {
        this.cliente = cliente;
        this.propriedades = propriedades;
        this.limitadorDoNominatim = limitadorDoNominatim;
        this.cacheDeCep = new CacheTemporario<>(CAPACIDADE_DO_CACHE, VALIDADE_DO_CACHE, relogio);
        this.cacheDeReverso = new CacheTemporario<>(CAPACIDADE_DO_CACHE, VALIDADE_DO_CACHE, relogio);
        this.cacheDeBusca = new CacheTemporario<>(CAPACIDADE_DO_CACHE, VALIDADE_DO_CACHE, relogio);
    }

    Optional<EnderecoResponse> buscarPorCep(String cep) {
        return emCache(cacheDeCep, cep, () -> consultarViaCep(cep));
    }

    Optional<EnderecoResponse> buscarPorCoordenadas(Coordenadas coordenadas) {
        Coordenadas arredondadas = coordenadas.arredondadas(CASAS_DECIMAIS_DO_REVERSO);
        return emCache(cacheDeReverso, arredondadas.chave(), () -> consultarReverso(arredondadas));
    }

    List<EnderecoResponse> buscar(String termo, Coordenadas proximidade) {
        String termoNormalizado = termo.trim().replaceAll("\\s+", " ");
        Coordenadas proximidadeArredondada = proximidade == null
                ? null
                : proximidade.arredondadas(CASAS_DECIMAIS_DA_PROXIMIDADE);
        String chave = termoNormalizado.toLowerCase(Locale.ROOT)
                + "|" + (proximidadeArredondada == null ? "" : proximidadeArredondada.chave());
        return emCache(cacheDeBusca, chave, () -> consultarBusca(termoNormalizado, proximidadeArredondada));
    }

    private Optional<EnderecoResponse> consultarViaCep(String cep) {
        JsonNode resposta = requisitar(() -> cliente.get()
                .uri(propriedades.viacepUrl() + "/ws/{cep}/json/", cep)
                .retrieve()
                .body(JsonNode.class));
        if (resposta.has("erro")) {
            return Optional.empty();
        }
        return Optional.of(EnderecoResponse.de(
                normalizarCep(texto(resposta, "cep")),
                texto(resposta, "logradouro"),
                "",
                texto(resposta, "bairro"),
                texto(resposta, "localidade"),
                texto(resposta, "uf").toUpperCase(Locale.ROOT),
                null,
                null,
                null
        ));
    }

    private Optional<EnderecoResponse> consultarReverso(Coordenadas coordenadas) {
        URI endereco = UriComponentsBuilder.fromUriString(propriedades.nominatimUrl())
                .path("/reverse")
                .queryParam("format", "jsonv2")
                .queryParam("addressdetails", 1)
                .queryParam("lat", decimal(coordenadas.latitude()))
                .queryParam("lon", decimal(coordenadas.longitude()))
                .queryParam("accept-language", IDIOMA)
                .build()
                .toUri();
        JsonNode resposta = requisitarNominatim(endereco);
        if (resposta.has("error") || !resposta.path("address").isObject()) {
            return Optional.empty();
        }
        return Optional.of(doNominatim(resposta, coordenadas));
    }

    private List<EnderecoResponse> consultarBusca(String termo, Coordenadas proximidade) {
        UriComponentsBuilder construtor = UriComponentsBuilder.fromUriString(propriedades.nominatimUrl())
                .path("/search")
                .queryParam("format", "jsonv2")
                .queryParam("addressdetails", 1)
                .queryParam("countrycodes", "br")
                .queryParam("limit", LIMITE_DE_SUGESTOES)
                .queryParam("accept-language", IDIOMA)
                .queryParam("q", "{termo}");
        if (proximidade != null) {
            construtor.queryParam("viewbox", caixaAoRedor(proximidade));
        }
        URI endereco = construtor.encode().buildAndExpand(Map.of("termo", termo)).toUri();
        JsonNode resposta = requisitarNominatim(endereco);
        if (!resposta.isArray()) {
            return List.of();
        }
        Map<String, EnderecoResponse> semRepeticao = new LinkedHashMap<>();
        for (JsonNode lugar : resposta) {
            EnderecoResponse encontrado = doNominatim(lugar, null);
            semRepeticao.putIfAbsent(encontrado.descricao(), encontrado);
        }
        return List.copyOf(semRepeticao.values());
    }

    private JsonNode requisitarNominatim(URI endereco) {
        try {
            limitadorDoNominatim.aguardarVez();
        } catch (InterruptedException interrupcao) {
            Thread.currentThread().interrupt();
            throw new ServicoDeEnderecosIndisponivelException(interrupcao);
        }
        return requisitar(() -> cliente.get().uri(endereco).retrieve().body(JsonNode.class));
    }

    private static JsonNode requisitar(Supplier<JsonNode> chamada) {
        JsonNode resposta;
        try {
            resposta = chamada.get();
        } catch (RestClientException falha) {
            throw new ServicoDeEnderecosIndisponivelException(falha);
        }
        if (resposta == null) {
            throw new ServicoDeEnderecosIndisponivelException(null);
        }
        return resposta;
    }

    private static <V> V emCache(CacheTemporario<V> cache, String chave, Supplier<V> consulta) {
        Optional<V> guardado = cache.buscar(chave);
        if (guardado.isPresent()) {
            return guardado.get();
        }
        V valor = consulta.get();
        cache.guardar(chave, valor);
        return valor;
    }

    private static EnderecoResponse doNominatim(JsonNode lugar, Coordenadas coordenadasInformadas) {
        JsonNode endereco = lugar.path("address");
        Double latitude = coordenadasInformadas != null ? coordenadasInformadas.latitude() : numero(lugar, "lat");
        Double longitude = coordenadasInformadas != null ? coordenadasInformadas.longitude() : numero(lugar, "lon");
        return EnderecoResponse.de(
                normalizarCep(texto(endereco, "postcode")),
                primeiroPreenchido(endereco, "road", "pedestrian", "highway", "footway"),
                texto(endereco, "house_number"),
                primeiroPreenchido(endereco, "suburb", "neighbourhood", "quarter"),
                primeiroPreenchido(endereco, "city", "town", "village", "municipality"),
                siglaDoEstado(endereco),
                latitude,
                longitude,
                texto(lugar, "display_name")
        );
    }

    private static String siglaDoEstado(JsonNode endereco) {
        String codigoIso = texto(endereco, "ISO3166-2-lvl4").toUpperCase(Locale.ROOT);
        if (codigoIso.matches("BR-[A-Z]{2}")) {
            return codigoIso.substring(3);
        }
        String nome = Normalizer.normalize(texto(endereco, "state"), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return UF_POR_NOME_DO_ESTADO.getOrDefault(nome, "");
    }

    private static String normalizarCep(String cep) {
        String primeiro = cep.split("[;,]")[0].replaceAll("\\D", "");
        if (primeiro.length() != 8) {
            return "";
        }
        return primeiro.substring(0, 5) + "-" + primeiro.substring(5);
    }

    private static String caixaAoRedor(Coordenadas centro) {
        BigDecimal latitude = BigDecimal.valueOf(centro.latitude());
        BigDecimal longitude = BigDecimal.valueOf(centro.longitude());
        BigDecimal oeste = longitude.subtract(RAIO_DA_PROXIMIDADE_EM_GRAUS).max(BigDecimal.valueOf(-180));
        BigDecimal leste = longitude.add(RAIO_DA_PROXIMIDADE_EM_GRAUS).min(BigDecimal.valueOf(180));
        BigDecimal norte = latitude.add(RAIO_DA_PROXIMIDADE_EM_GRAUS).min(BigDecimal.valueOf(90));
        BigDecimal sul = latitude.subtract(RAIO_DA_PROXIMIDADE_EM_GRAUS).max(BigDecimal.valueOf(-90));
        return String.join(",", decimal(oeste), decimal(norte), decimal(leste), decimal(sul));
    }

    private static String primeiroPreenchido(JsonNode no, String... campos) {
        for (String campo : campos) {
            String valor = texto(no, campo);
            if (!valor.isEmpty()) {
                return valor;
            }
        }
        return "";
    }

    private static String texto(JsonNode no, String campo) {
        JsonNode valor = no.path(campo);
        return valor.isValueNode() ? valor.asText("").trim() : "";
    }

    private static Double numero(JsonNode no, String campo) {
        String valor = texto(no, campo);
        if (valor.isEmpty()) {
            return null;
        }
        try {
            return Double.valueOf(valor);
        } catch (NumberFormatException valorInvalido) {
            return null;
        }
    }

    private static String decimal(double valor) {
        return decimal(BigDecimal.valueOf(valor));
    }

    private static String decimal(BigDecimal valor) {
        return valor.stripTrailingZeros().toPlainString();
    }
}
