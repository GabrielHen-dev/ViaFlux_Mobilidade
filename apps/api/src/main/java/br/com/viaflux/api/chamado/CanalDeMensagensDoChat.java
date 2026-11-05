package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface CanalDeMensagensDoChat {

    String ASSUNTO_DA_NOTIFICACAO = "Nova mensagem";

    public void avisarNovaMensagem(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String mensagem, OffsetDateTime instante);

    public void marcarMensagensComoLidas(UUID destinatarioId, UUID chamadoId, OffsetDateTime ate);

    public void dispensarEmailsDaEquipe(UUID chamadoId, UUID solicitanteId);
}
