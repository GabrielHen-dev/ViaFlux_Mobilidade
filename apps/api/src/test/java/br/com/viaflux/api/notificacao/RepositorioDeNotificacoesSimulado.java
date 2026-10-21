package br.com.viaflux.api.notificacao;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class RepositorioDeNotificacoesSimulado {

    @Bean
    NotificacaoRepository notificacaoRepository() {
        return mock(NotificacaoRepository.class);
    }
}
