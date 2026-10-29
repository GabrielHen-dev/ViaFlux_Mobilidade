package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.time.LocalTime;
import java.time.ZoneId;

@Configuration
@EnableScheduling
@EnableConfigurationProperties({PrazosDeTriagemProperties.class, AnexosProperties.class})
class ChamadoConfig {

    static final ZoneId FUSO_DA_OPERACAO = ZoneId.of("America/Fortaleza");
    private static final LocalTime ABERTURA_DO_EXPEDIENTE = LocalTime.of(8, 0);
    private static final LocalTime FECHAMENTO_DO_EXPEDIENTE = LocalTime.of(18, 0);

    @Bean
    Clock relogioDoSistema() {
        return Clock.systemUTC();
    }

    @Bean
    RelogioDeHorasUteis relogioDoExpediente() {
        return new RelogioDeHorasUteis(FUSO_DA_OPERACAO, ABERTURA_DO_EXPEDIENTE, FECHAMENTO_DO_EXPEDIENTE);
    }

    @Bean
    RelogioCorrido relogioCorrido() {
        return new RelogioCorrido();
    }
}
