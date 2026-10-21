package br.com.viaflux.api.endereco;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(EnderecoProperties.class)
class EnderecoConfig {

    private static final Duration TEMPO_LIMITE_DE_CONEXAO = Duration.ofSeconds(3);
    private static final Duration TEMPO_LIMITE_DE_LEITURA = Duration.ofSeconds(5);

    @Bean
    EnderecoService enderecoService(RestClient.Builder construtor, EnderecoProperties propriedades) {
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(TEMPO_LIMITE_DE_CONEXAO);
        fabrica.setReadTimeout(TEMPO_LIMITE_DE_LEITURA);
        RestClient cliente = construtor.clone()
                .requestFactory(fabrica)
                .defaultHeader(HttpHeaders.USER_AGENT, propriedades.userAgent())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
        return new EnderecoService(cliente, propriedades, LimitadorDeRequisicoes.umaPorSegundo(), Clock.systemUTC());
    }
}
