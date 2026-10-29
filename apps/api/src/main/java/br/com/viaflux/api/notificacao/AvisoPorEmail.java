package br.com.viaflux.api.notificacao;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.email.ModelosDeEmail;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
class AvisoPorEmail {

    private static final Logger log = LoggerFactory.getLogger(AvisoPorEmail.class);

    private record Aparencia(String titulo, String fundo, String texto) {
    }

    private static final Aparencia APARENCIA_PADRAO = new Aparencia("Atualização do chamado", "#EFF6FF", "#1D4ED8");
    private static final Map<String, Aparencia> APARENCIA_DO_STATUS = Map.of(
            "aberto", new Aparencia("Chamado registrado", "#FEFCE8", "#A16207"),
            "em triagem", new Aparencia("Chamado em triagem", "#FEFCE8", "#A16207"),
            "na fila", new Aparencia("Chamado na fila de atendimento", "#ECFEFF", "#0E7490"),
            "em atendimento", new Aparencia("Chamado em atendimento", "#EFF6FF", "#1D4ED8"),
            "aguardando", new Aparencia("Chamado aguardando retorno", "#F5F3FF", "#6D28D9"),
            "resolvido", new Aparencia("Chamado resolvido", "#F0FDF4", "#15803D"),
            "fechado", new Aparencia("Chamado encerrado", "#F1F5F9", "#475569")
    );

    private final UsuarioRepository usuarios;
    private final CaixaDeSaida caixaDeSaida;
    private final ModelosDeEmail modelos;
    private final String portalUrl;

    AvisoPorEmail(UsuarioRepository usuarios, CaixaDeSaida caixaDeSaida, ModelosDeEmail modelos,
                  @Value("${viaflux.conta.portal-url}") String portalUrl) {
        this.usuarios = usuarios;
        this.caixaDeSaida = caixaDeSaida;
        this.modelos = modelos;
        this.portalUrl = portalUrl.endsWith("/") ? portalUrl.substring(0, portalUrl.length() - 1) : portalUrl;
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    void aoRegistrarNotificacao(NotificacaoRegistrada notificacao) {
        try {
            usuarios.findById(notificacao.destinatarioId())
                    .filter(Usuario::isAtivo)
                    .ifPresent(destinatario -> caixaDeSaida.enviar(mensagemPara(destinatario, notificacao)));
        } catch (RuntimeException falha) {
            log.warn("Não foi possível enviar o e-mail do chamado {}: {}", notificacao.codigoDoChamado(), falha.getMessage());
        }
    }

    private CaixaDeSaida.Mensagem mensagemPara(Usuario destinatario, NotificacaoRegistrada notificacao) {
        Aparencia aparencia = APARENCIA_DO_STATUS.getOrDefault(
                notificacao.novoStatus().trim().toLowerCase(Locale.ROOT), APARENCIA_PADRAO);
        String assunto = "Chamado " + notificacao.codigoDoChamado() + ": " + notificacao.novoStatus();
        return modelos.montar(destinatario.getEmail(), "chamado", assunto, aparencia.titulo(), "Acompanhar chamado",
                linkDoChamado(destinatario, notificacao.codigoDoChamado()), Map.of(
                        "nome", destinatario.getNome(),
                        "codigo", notificacao.codigoDoChamado(),
                        "status", notificacao.novoStatus(),
                        "mensagem", notificacao.mensagem(),
                        "fundoDoStatus", aparencia.fundo(),
                        "corDoStatus", aparencia.texto()
                ));
    }

    private String linkDoChamado(Usuario destinatario, String codigo) {
        Set<String> perfis = destinatario.getPerfis().stream().map(Perfil::getCodigo).collect(Collectors.toSet());
        boolean somenteCliente = !perfis.isEmpty() && UsuarioAtual.PERFIS_DE_CLIENTE.containsAll(perfis);
        String rota = somenteCliente ? "/portal/chamados/" : "/chamados/";
        return portalUrl + rota + UriUtils.encodePathSegment(codigo, StandardCharsets.UTF_8);
    }
}
