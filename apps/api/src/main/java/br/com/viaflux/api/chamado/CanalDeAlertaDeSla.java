package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface CanalDeAlertaDeSla {

    public void registrarNoPortal(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String assunto, String mensagem, OffsetDateTime instante);

    public boolean enviarPorEmail(UUID destinatarioId, String codigoDoChamado, String assunto, String mensagem);
}
