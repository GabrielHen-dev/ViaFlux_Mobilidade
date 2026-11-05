package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.function.Consumer;

@Component
public class AvisoAoSolicitante {

    private final CanalDeNotificacao canal;
    private final HistoricoDoChamado historico;

    public AvisoAoSolicitante(CanalDeNotificacao canal, HistoricoDoChamado historico) {
        this.canal = canal;
        this.historico = historico;
    }

    public void avisar(Chamado chamado, String novoStatus, String mensagem, OffsetDateTime instante) {
        entregar(chamado, novoStatus,
                destinatario -> canal.enviar(destinatario, chamado.getId(), chamado.getCodigo(), novoStatus, mensagem, instante), instante);
    }

    public void entregar(Chamado chamado, String assunto, Consumer<UUID> entrega, OffsetDateTime instante) {
        if (chamado.getSolicitante() == null) {
            historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Notificação não enviada",
                    assunto + ": chamado sem solicitante vinculado no portal.", Autor.SISTEMA, instante);
            return;
        }
        entrega.accept(chamado.getSolicitante().getId());
        historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Cliente notificado",
                "Central de notificações do portal · " + assunto, Autor.SISTEMA, instante);
    }
}
