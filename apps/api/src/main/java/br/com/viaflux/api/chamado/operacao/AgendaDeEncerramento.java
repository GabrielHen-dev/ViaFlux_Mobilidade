package br.com.viaflux.api.chamado.operacao;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AgendaDeEncerramento{

    private final EncerramentoService encerramento;

    public AgendaDeEncerramento(EncerramentoService encerramento) {
        this.encerramento = encerramento;
    }

    @Scheduled(initialDelayString = "${viaflux.chamados.encerramento.atraso-inicial:PT1M}",
            fixedDelayString = "${viaflux.chamados.encerramento.intervalo:PT5M}")
    public void verificarPrazosDeConfirmacao() {
        encerramento.processarPrazosDeConfirmacao();
    }
}
