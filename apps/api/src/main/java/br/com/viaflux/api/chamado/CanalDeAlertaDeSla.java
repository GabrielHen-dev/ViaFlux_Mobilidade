package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface CanalDeAlertaDeSla {

    void registrarNoPortal(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String assunto, String mensagem, OffsetDateTime instante);

    boolean enviarPorEmail(UUID destinatarioId, String codigoDoChamado, String assunto, String mensagem);
}
