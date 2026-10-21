package br.com.viaflux.api.chamado;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class RepositoriosDeChamadoSimulados {

    @Bean
    ChamadoRepository chamadoRepository() {
        return mock(ChamadoRepository.class);
    }

    @Bean
    ChamadoEventoRepository chamadoEventoRepository() {
        return mock(ChamadoEventoRepository.class);
    }

    @Bean
    ChamadoAnexoRepository chamadoAnexoRepository() {
        return mock(ChamadoAnexoRepository.class);
    }

    @Bean
    ServicoTerceiroRepository servicoTerceiroRepository() {
        return mock(ServicoTerceiroRepository.class);
    }

    @Bean
    MotivoRepository motivoRepository() {
        return mock(MotivoRepository.class);
    }

    @Bean
    ContextoRepository contextoRepository() {
        return mock(ContextoRepository.class);
    }
}
