package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.abertura.AberturaDeChamadoService;
import br.com.viaflux.api.chamado.atendimento.AtendimentoService;
import br.com.viaflux.api.chamado.consulta.ConsultaDeChamadosService;
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
    ResponsavelPeloAtendimentoService responsavelPeloAtendimentoService() {
        return mock(ResponsavelPeloAtendimentoService.class);
    }

    @Bean
    CancelamentoService cancelamentoService() {
        return mock(CancelamentoService.class);
    }
}
