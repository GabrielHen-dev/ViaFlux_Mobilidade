package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static br.com.viaflux.api.chamado.DadosDeLocalizacao.texto;

@Embeddable
class Localizacao {

    @Column(name = "localizacao", nullable = false, length = 255)
    private String endereco = "";

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "cep", nullable = false, length = 9)
    private String cep = "";

    @Column(name = "logradouro", nullable = false, length = 200)
    private String logradouro = "";

    @Column(name = "numero", nullable = false, length = 20)
    private String numero = "";

    @Column(name = "complemento", nullable = false, length = 200)
    private String complemento = "";

    @Column(name = "bairro", nullable = false, length = 120)
    private String bairro = "";

    @Column(name = "cidade", nullable = false, length = 120)
    private String cidade = "";

    @Column(name = "uf", nullable = false, length = 2)
    private String uf = "";

    protected Localizacao() {
    }

    static Localizacao de(DadosDeLocalizacao dados) {
        Localizacao localizacao = new Localizacao();
        if (dados == null) {
            return localizacao;
        }
        localizacao.latitude = dados.temCoordenadas() ? dados.latitude() : null;
        localizacao.longitude = dados.temCoordenadas() ? dados.longitude() : null;
        localizacao.cep = texto(dados.cep());
        localizacao.logradouro = texto(dados.logradouro());
        localizacao.numero = texto(dados.numero());
        localizacao.complemento = texto(dados.complemento());
        localizacao.bairro = texto(dados.bairro());
        localizacao.cidade = texto(dados.cidade());
        localizacao.uf = texto(dados.uf()).toUpperCase(Locale.ROOT);
        String informado = texto(dados.endereco());
        localizacao.endereco = informado.isEmpty() ? localizacao.descricaoMontada() : informado;
        return localizacao;
    }

    private String descricaoMontada() {
        String rua = juntar(", ", logradouro, numero);
        String municipio = juntar(" – ", cidade, uf);
        String descricao = juntar(" · ", rua, complemento, bairro, municipio);
        if (descricao.isEmpty() && latitude != null && longitude != null) {
            return String.format(Locale.ROOT, "%.5f, %.5f", latitude, longitude);
        }
        return descricao;
    }

    private static String juntar(String separador, String... partes) {
        return Stream.of(partes).filter(parte -> !parte.isBlank()).collect(Collectors.joining(separador));
    }

    boolean informada() {
        return !endereco.isBlank() || latitude != null;
    }

    String origem() {
        return latitude != null ? "GPS do aparelho" : "endereço informado";
    }

    DadosDeLocalizacao paraDados() {
        return new DadosDeLocalizacao(endereco, latitude, longitude, cep, logradouro, numero, complemento, bairro, cidade, uf);
    }

    String getEndereco() {
        return endereco;
    }
}
