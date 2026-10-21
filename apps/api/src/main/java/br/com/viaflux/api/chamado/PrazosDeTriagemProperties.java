package br.com.viaflux.api.chamado;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "viaflux.triagem")
record PrazosDeTriagemProperties(
        @DefaultValue("10") int urgenciaAltaMinutos,
        @DefaultValue("20") int urgenciaMediaMinutos,
        @DefaultValue("40") int urgenciaBaixaMinutos
) {

    int minutosPara(Integer urgenciaDeclarada) {
        if (urgenciaDeclarada == null) {
            return urgenciaMediaMinutos;
        }
        return switch (urgenciaDeclarada) {
            case 5 -> urgenciaAltaMinutos;
            case 1 -> urgenciaBaixaMinutos;
            default -> urgenciaMediaMinutos;
        };
    }
}
