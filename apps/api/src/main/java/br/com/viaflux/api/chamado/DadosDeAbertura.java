package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;

record DadosDeAbertura(
        String cliente,
        String telefone,
        String modelo,
        String placa,
        String descricao,
        DadosDeLocalizacao localizacao,
        Usuario solicitante,
        Motivo motivo,
        Contexto contexto,
        int prazoDeTriagemMinutos,
        String chaveIdempotencia
) {
}
