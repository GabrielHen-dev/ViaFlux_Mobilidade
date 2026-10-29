package br.com.viaflux.api.notificacao;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

public record NotificacaoResponse(UUID id, String chamadoId, String novoStatus, String mensagem, OffsetDateTime criadaEm, boolean lida) {

    private static final ZoneId FUSO_DA_OPERACAO = ZoneId.of("America/Fortaleza");

    static NotificacaoResponse de(Notificacao notificacao) {
        return new NotificacaoResponse(
                notificacao.getId(),
                notificacao.getChamadoCodigo(),
                notificacao.getNovoStatus(),
                notificacao.getMensagem(),
                notificacao.getCriadaEm().atZoneSameInstant(FUSO_DA_OPERACAO).toOffsetDateTime(),
                notificacao.isLida()
        );
    }
}
