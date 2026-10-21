package br.com.viaflux.api.chamado;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class ServicosDeChamadoSimulados {

    @Bean
    AberturaDeChamadoService aberturaDeChamadoService() {
        return mock(AberturaDeChamadoService.class);
    }

    @Bean
    ConsultaDeChamadosService consultaDeChamadosService() {
        return mock(ConsultaDeChamadosService.class);
    }

    @Bean
    AtendimentoService atendimentoService() {
        return mock(AtendimentoService.class);
    }

    @Bean
    LixeiraService lixeiraService() {
        return mock(LixeiraService.class);
    }
}
