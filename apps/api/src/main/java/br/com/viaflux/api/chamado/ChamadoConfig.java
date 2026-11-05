package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.anexo.AnexosProperties;
import br.com.viaflux.api.chamado.anexo.ArmazenamentoDeArquivos;
import br.com.viaflux.api.chamado.anexo.ArmazenamentoEmDisco;
import br.com.viaflux.api.chamado.anexo.ArmazenamentoEmS3;
import br.com.viaflux.api.chamado.triagem.PrazosDeTriagemProperties;
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
public class ChamadoConfig {

    static final ZoneId FUSO_DA_OPERACAO = ZoneId.of("America/Fortaleza");
    private static final LocalTime ABERTURA_DO_EXPEDIENTE = LocalTime.of(8, 0);
    private static final LocalTime FECHAMENTO_DO_EXPEDIENTE = LocalTime.of(18, 0);

    @Bean
    public Clock relogioDoSistema() {
        return Clock.systemUTC();
    }

    @Bean
    public RelogioDeHorasUteis relogioDoExpediente() {
        return new RelogioDeHorasUteis(FUSO_DA_OPERACAO, ABERTURA_DO_EXPEDIENTE, FECHAMENTO_DO_EXPEDIENTE);
    }

    @Bean
    public RelogioCorrido relogioCorrido() {
        return new RelogioCorrido();
    }

    @Bean
    public ArmazenamentoDeArquivos armazenamentoDeArquivos(AnexosProperties propriedades) {
        return switch (propriedades.armazenamento()) {
            case DISCO -> new ArmazenamentoEmDisco(propriedades);
            case S3 -> ArmazenamentoEmS3.conectar(propriedades.s3());
        };
    }
}
