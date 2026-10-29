package br.com.viaflux.api.conta;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties("viaflux.conta")
public record ContaProperties(
        String portalUrl,
        String remetente,
        String termosVersao,
        Duration validadeDaVerificacao,
        Duration validadeDaRedefinicao,
        Duration validadeDoConvite,
        int tentativasPorJanela,
        Duration janelaDeTentativas
) {

    String linkPara(String caminho, String token) {
        String base = portalUrl.endsWith("/") ? portalUrl.substring(0, portalUrl.length() - 1) : portalUrl;
        return base + caminho + "?token=" + token;
    }
}
