package br.com.viaflux.api.conta;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class RepositorioDeTokensSimulado {

    @Bean
    TokenDeContaRepository tokenDeContaRepository() {
        return mock(TokenDeContaRepository.class);
    }
}
