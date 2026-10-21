package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface CanalDeNotificacao {

    void enviar(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String novoStatus, String mensagem, OffsetDateTime instante);
}
