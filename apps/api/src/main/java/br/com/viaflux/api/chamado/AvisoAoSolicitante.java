package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
class AvisoAoSolicitante {

    private final CanalDeNotificacao canal;
    private final HistoricoDoChamado historico;

    AvisoAoSolicitante(CanalDeNotificacao canal, HistoricoDoChamado historico) {
        this.canal = canal;
        this.historico = historico;
    }

    void avisar(Chamado chamado, String novoStatus, String mensagem, OffsetDateTime instante) {
        if (chamado.getSolicitante() == null) {
            historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Notificação não enviada",
                    novoStatus + ": chamado sem solicitante vinculado no portal.", Autor.SISTEMA, instante);
            return;
        }
        canal.enviar(chamado.getSolicitante().getId(), chamado.getId(), chamado.getCodigo(), novoStatus, mensagem, instante);
        historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Cliente notificado",
                "Central de notificações do portal · " + novoStatus, Autor.SISTEMA, instante);
    }
}
