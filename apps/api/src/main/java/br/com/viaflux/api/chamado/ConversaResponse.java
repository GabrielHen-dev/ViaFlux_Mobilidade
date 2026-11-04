package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.List;

public record ConversaResponse(List<MensagemResponse> mensagens, OffsetDateTime lidoAte) {
}
