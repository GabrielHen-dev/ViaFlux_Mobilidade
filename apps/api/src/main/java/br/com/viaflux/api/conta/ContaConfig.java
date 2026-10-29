package br.com.viaflux.api.conta;

import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
@EnableConfigurationProperties(ContaProperties.class)
class ContaConfig {

    @Bean
    LimiteDeTentativas limiteDeTentativasDeConta(ContaProperties propriedades, Clock relogio) {
        return new LimiteDeTentativas(propriedades.tentativasPorJanela(), propriedades.janelaDeTentativas(), relogio);
    }
}
