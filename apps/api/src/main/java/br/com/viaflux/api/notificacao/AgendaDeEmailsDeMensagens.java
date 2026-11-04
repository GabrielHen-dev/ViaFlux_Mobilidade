package br.com.viaflux.api.notificacao;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;

@Component
class AgendaDeEmailsDeMensagens {

    private final CentralDeNotificacoes central;
    private final AvisoPorEmail avisoPorEmail;
    private final Clock relogio;
    private final Duration espera;

    AgendaDeEmailsDeMensagens(CentralDeNotificacoes central, AvisoPorEmail avisoPorEmail, Clock relogio,
                              @Value("${viaflux.notificacoes.mensagens.espera-do-email:PT5M}") Duration espera) {
        this.central = central;
        this.avisoPorEmail = avisoPorEmail;
        this.relogio = relogio;
        this.espera = espera;
    }

    @Scheduled(initialDelayString = "${viaflux.notificacoes.mensagens.atraso-inicial:PT1M}",
            fixedDelayString = "${viaflux.notificacoes.mensagens.intervalo:PT1M}")
    void enviarEmailsVencidos() {
        central.emailsVencidos(OffsetDateTime.now(relogio).minus(espera))
                .forEach(email -> central.registrarTentativaDeEmail(email.notificacaoId(), avisoPorEmail.entregar(email.conteudo())));
    }
}
