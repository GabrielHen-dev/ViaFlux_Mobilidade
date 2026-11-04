package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.chamado.AcessoDoDestinatario;
import br.com.viaflux.api.chamado.CanalDeMensagensDoChat;
import br.com.viaflux.api.chamado.CanalDeNotificacao;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
class CentralDeNotificacoes implements CanalDeNotificacao, CanalDeMensagensDoChat {

    record EmailVencido(UUID notificacaoId, NotificacaoRegistrada conteudo) {
    }

    private static final Logger log = LoggerFactory.getLogger(CentralDeNotificacoes.class);
    private static final int TAMANHO_MAXIMO_DA_MENSAGEM = 255;
    private static final int TENTATIVAS_MAXIMAS_DE_EMAIL = 5;

    private final NotificacaoRepository notificacoes;
    private final ApplicationEventPublisher eventos;
    private final AcessoDoDestinatario acessoDoDestinatario;

    CentralDeNotificacoes(NotificacaoRepository notificacoes, ApplicationEventPublisher eventos, AcessoDoDestinatario acessoDoDestinatario) {
        this.notificacoes = notificacoes;
        this.eventos = eventos;
        this.acessoDoDestinatario = acessoDoDestinatario;
    }

    @Override
    @Transactional
    public void enviar(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String novoStatus, String mensagem, OffsetDateTime instante) {
        notificacoes.save(new Notificacao(destinatarioId, chamadoId, codigoDoChamado, novoStatus, limitado(mensagem), instante));
        eventos.publishEvent(new NotificacaoRegistrada(destinatarioId, codigoDoChamado, novoStatus, mensagem));
    }

    @Override
    @Transactional
    public void avisarNovaMensagem(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String mensagem, OffsetDateTime instante) {
        String texto = limitado(mensagem);
        notificacoes.findFirstByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalseOrderByCriadaEmDesc(destinatarioId, chamadoId, ASSUNTO_DA_NOTIFICACAO)
                .ifPresentOrElse(
                        pendente -> pendente.atualizarMensagem(texto, instante),
                        () -> notificacoes.save(Notificacao.comEmailAdiado(destinatarioId, chamadoId, codigoDoChamado, ASSUNTO_DA_NOTIFICACAO, texto, instante))
                );
    }

    @Override
    @Transactional
    public void marcarMensagensComoLidas(UUID destinatarioId, UUID chamadoId, OffsetDateTime ate) {
        notificacoes.findByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalse(destinatarioId, chamadoId, ASSUNTO_DA_NOTIFICACAO).stream()
                .filter(notificacao -> !notificacao.getCriadaEm().isAfter(ate))
                .forEach(Notificacao::marcarComoLida);
    }

    @Override
    @Transactional
    public void dispensarEmailsDaEquipe(UUID chamadoId, UUID solicitanteId) {
        notificacoes.findByChamadoIdAndNovoStatusAndEmailAdiadoDesdeIsNotNull(chamadoId, ASSUNTO_DA_NOTIFICACAO).stream()
                .filter(notificacao -> !notificacao.getDestinatarioId().equals(solicitanteId))
                .forEach(Notificacao::concluirEsperaDoEmail);
    }

    @Transactional
    List<EmailVencido> emailsVencidos(OffsetDateTime limite) {
        return notificacoes.findByLidaFalseAndEmailAdiadoDesdeLessThanEqual(limite).stream()
                .filter(CentralDeNotificacoes.this::destinatarioAindaTemAcesso)
                .map(notificacao -> new EmailVencido(notificacao.getId(), new NotificacaoRegistrada(
                        notificacao.getDestinatarioId(), notificacao.getChamadoCodigo(), notificacao.getNovoStatus(), notificacao.getMensagem())))
                .toList();
    }

    @Transactional
    void registrarTentativaDeEmail(UUID notificacaoId, boolean entregue) {
        notificacoes.findById(notificacaoId).ifPresent(notificacao -> {
            if (entregue) {
                notificacao.concluirEsperaDoEmail();
            } else if (notificacao.registrarFalhaDoEmail() >= TENTATIVAS_MAXIMAS_DE_EMAIL) {
                log.error("E-mail de mensagem do chamado {} abandonado depois de {} tentativas.", notificacao.getChamadoCodigo(), TENTATIVAS_MAXIMAS_DE_EMAIL);
                notificacao.concluirEsperaDoEmail();
            }
        });
    }

    private boolean destinatarioAindaTemAcesso(Notificacao notificacao) {
        boolean temAcesso = acessoDoDestinatario.podeVerChamado(notificacao.getDestinatarioId(), notificacao.getChamadoId());
        if (!temAcesso) {
            notificacao.concluirEsperaDoEmail();
        }
        return temAcesso;
    }

    private static String limitado(String mensagem) {
        return mensagem.length() > TAMANHO_MAXIMO_DA_MENSAGEM ? mensagem.substring(0, TAMANHO_MAXIMO_DA_MENSAGEM) : mensagem;
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
