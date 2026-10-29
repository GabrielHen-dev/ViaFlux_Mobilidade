package br.com.viaflux.api.notificacao;

import java.util.UUID;

record NotificacaoRegistrada(UUID destinatarioId, String codigoDoChamado, String novoStatus, String mensagem) {
}
