package br.com.viaflux.api.endereco;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "viaflux.enderecos")
public record EnderecoProperties(String nominatimUrl, String viacepUrl, String userAgent) {

    static final String NOMINATIM_PADRAO = "https://nominatim.openstreetmap.org";
    static final String VIACEP_PADRAO = "https://viacep.com.br";
    static final String USER_AGENT_PADRAO = "ViaFlux-Mobilidade/1.0 (residencia-avanade-squad03)";

    public EnderecoProperties {
        nominatimUrl = semBarraFinal(valorOuPadrao(nominatimUrl, NOMINATIM_PADRAO));
        viacepUrl = semBarraFinal(valorOuPadrao(viacepUrl, VIACEP_PADRAO));
        userAgent = valorOuPadrao(userAgent, USER_AGENT_PADRAO);
    }

    private static String valorOuPadrao(String valor, String padrao) {
        return valor == null || valor.isBlank() ? padrao : valor.trim();
    }

    private static String semBarraFinal(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
