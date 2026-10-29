package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.chamado.CanalDeNotificacao;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
class CentralDeNotificacoes implements CanalDeNotificacao {

    private static final int TAMANHO_MAXIMO_DA_MENSAGEM = 255;

    private final NotificacaoRepository notificacoes;
    private final ApplicationEventPublisher eventos;

    CentralDeNotificacoes(NotificacaoRepository notificacoes, ApplicationEventPublisher eventos) {
        this.notificacoes = notificacoes;
        this.eventos = eventos;
    }

    @Override
    @Transactional
    public void enviar(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String novoStatus, String mensagem, OffsetDateTime instante) {
        String texto = mensagem.length() > TAMANHO_MAXIMO_DA_MENSAGEM ? mensagem.substring(0, TAMANHO_MAXIMO_DA_MENSAGEM) : mensagem;
        notificacoes.save(new Notificacao(destinatarioId, chamadoId, codigoDoChamado, novoStatus, texto, instante));
        eventos.publishEvent(new NotificacaoRegistrada(destinatarioId, codigoDoChamado, novoStatus, mensagem));
    }

    @Transactional(readOnly = true)
    List<NotificacaoResponse> doUsuario(UUID usuarioId) {
        return notificacoes.findTop100ByDestinatarioIdOrderByCriadaEmDesc(usuarioId).stream().map(NotificacaoResponse::de).toList();
    }

    @Transactional
    void marcarComoLida(UUID notificacaoId, UUID usuarioId) {
        notificacoes.findByIdAndDestinatarioId(notificacaoId, usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."))
                .marcarComoLida();
    }

    @Transactional
    void marcarTodasComoLidas(UUID usuarioId) {
        notificacoes.marcarTodasComoLidas(usuarioId);
    }
}
