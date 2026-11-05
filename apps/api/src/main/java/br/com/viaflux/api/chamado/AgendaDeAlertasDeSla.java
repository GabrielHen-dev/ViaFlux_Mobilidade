package br.com.viaflux.api.chamado;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AgendaDeAlertasDeSla {

    private final AlertasDeSlaService alertas;

    public AgendaDeAlertasDeSla(AlertasDeSlaService alertas) {
        this.alertas = alertas;
    }

    @Scheduled(initialDelayString = "${viaflux.chamados.alertas-sla.atraso-inicial:PT1M}",
            fixedDelayString = "${viaflux.chamados.alertas-sla.intervalo:PT1M}")
    public void verificarPrazos() {
        alertas.verificarPrazos();
    }
}
