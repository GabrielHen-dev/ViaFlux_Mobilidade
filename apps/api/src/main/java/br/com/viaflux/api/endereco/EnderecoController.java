package br.com.viaflux.api.endereco;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/enderecos")
@Tag(name = "Endereços", description = "Consulta de CEP, endereço a partir da localização e busca de ruas")
class EnderecoController {

    private static final Pattern FORMATO_DE_CEP = Pattern.compile("\\d{5}-?\\d{3}");
    private static final int TAMANHO_MINIMO_DA_BUSCA = 3;
    private static final int TAMANHO_MAXIMO_DA_BUSCA = 200;

    private final EnderecoService enderecoService;

    EnderecoController(EnderecoService enderecoService) {
        this.enderecoService = enderecoService;
    }

    @GetMapping("/cep/{cep}")
    @Operation(
            summary = "Buscar endereço pelo CEP",
            description = "Consulta o ViaCEP pelo backend. Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Endereço do CEP"),
            @ApiResponse(responseCode = "400", description = "CEP sem 8 dígitos"),
            @ApiResponse(responseCode = "404", description = "CEP não encontrado"),
            @ApiResponse(responseCode = "503", description = "Serviço de CEP indisponível")
    })
    EnderecoResponse porCep(@PathVariable String cep) {
        String cepInformado = cep.trim();
        if (!FORMATO_DE_CEP.matcher(cepInformado).matches()) {
            throw new ConsultaDeEnderecoInvalidaException("Informe um CEP com 8 dígitos.");
        }
        return enderecoService.buscarPorCep(cepInformado.replace("-", ""))
                .orElseThrow(() -> new EnderecoNaoEncontradoException("CEP não encontrado."));
    }

    @GetMapping("/reverso")
    @Operation(
            summary = "Buscar endereço a partir de latitude e longitude",
            description = "Consulta o OpenStreetMap Nominatim pelo backend, com no máximo 1 requisição por segundo e cache de 6 horas. "
                    + "Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Endereço mais próximo das coordenadas"),
            @ApiResponse(responseCode = "400", description = "Coordenadas ausentes ou fora do intervalo"),
            @ApiResponse(responseCode = "404", description = "Nenhum endereço para essas coordenadas"),
            @ApiResponse(responseCode = "503", description = "Serviço de endereços indisponível")
    })
    EnderecoResponse porCoordenadas(
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude
    ) {
        if (latitude == null || longitude == null) {
            throw new ConsultaDeEnderecoInvalidaException("Informe latitude e longitude.");
        }
        return enderecoService.buscarPorCoordenadas(coordenadasValidas(latitude, longitude))
                .orElseThrow(() -> new EnderecoNaoEncontradoException(
                        "Não encontramos um endereço para essa localização."));
    }

    @GetMapping("/busca")
    @Operation(
            summary = "Sugerir endereços pelo nome da rua",
            description = "Consulta o OpenStreetMap Nominatim pelo backend, com no máximo 1 requisição por segundo e cache de 6 horas. "
                    + "Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Até 5 sugestões, priorizando as próximas da localização informada"),
            @ApiResponse(responseCode = "400", description = "Busca com menos de 3 caracteres ou coordenadas inválidas"),
            @ApiResponse(responseCode = "503", description = "Serviço de endereços indisponível")
    })
    List<EnderecoResponse> buscar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude
    ) {
        String termo = q == null ? "" : q.trim();
        if (termo.length() < TAMANHO_MINIMO_DA_BUSCA) {
            throw new ConsultaDeEnderecoInvalidaException("Digite pelo menos 3 caracteres para buscar o endereço.");
        }
        if (termo.length() > TAMANHO_MAXIMO_DA_BUSCA) {
            throw new ConsultaDeEnderecoInvalidaException("A busca pode ter no máximo 200 caracteres.");
        }
        if ((latitude == null) != (longitude == null)) {
            throw new ConsultaDeEnderecoInvalidaException("Informe latitude e longitude juntas.");
        }
        Coordenadas proximidade = latitude == null ? null : coordenadasValidas(latitude, longitude);
        return enderecoService.buscar(termo, proximidade);
    }

    private static Coordenadas coordenadasValidas(double latitude, double longitude) {
        if (!Coordenadas.validas(latitude, longitude)) {
            throw new ConsultaDeEnderecoInvalidaException(
                    "Latitude deve estar entre -90 e 90 e longitude entre -180 e 180.");
        }
        return new Coordenadas(latitude, longitude);
    }
}
