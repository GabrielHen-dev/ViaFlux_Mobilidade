package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.chamado.CanalDeAlertaDeSla;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
class AlertaDeSlaNosCanais implements CanalDeAlertaDeSla {

    private final NotificacaoRepository notificacoes;
    private final AvisoPorEmail email;

    AlertaDeSlaNosCanais(NotificacaoRepository notificacoes, AvisoPorEmail email) {
        this.notificacoes = notificacoes;
        this.email = email;
    }

    @Override
    public void registrarNoPortal(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String assunto, String mensagem, OffsetDateTime instante) {
        notificacoes.save(new Notificacao(destinatarioId, chamadoId, codigoDoChamado, assunto, mensagem, instante));
    }

    @Override
    public boolean enviarPorEmail(UUID destinatarioId, String codigoDoChamado, String assunto, String mensagem) {
        return email.entregar(new NotificacaoRegistrada(destinatarioId, codigoDoChamado, assunto, mensagem));
    }
}
