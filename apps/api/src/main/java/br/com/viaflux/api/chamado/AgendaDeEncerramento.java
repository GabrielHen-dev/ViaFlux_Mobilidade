package br.com.viaflux.api.chamado;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class AgendaDeEncerramento {

    private final EncerramentoService encerramento;

    AgendaDeEncerramento(EncerramentoService encerramento) {
        this.encerramento = encerramento;
    }

    @Scheduled(initialDelayString = "${viaflux.chamados.encerramento.atraso-inicial:PT1M}",
            fixedDelayString = "${viaflux.chamados.encerramento.intervalo:PT5M}")
    void verificarPrazosDeConfirmacao() {
        encerramento.processarPrazosDeConfirmacao();
    }
}
