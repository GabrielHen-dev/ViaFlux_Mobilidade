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
        String motivoOutro,
        java.util.UUID abertoPorId,
        String abertoPorNome,
        int prazoDeTriagemMinutos,
        String chaveIdempotencia
) {
    DadosDeAbertura(String cliente, String telefone, String modelo, String placa, String descricao, DadosDeLocalizacao localizacao,
                    Usuario solicitante, Motivo motivo, Contexto contexto, int prazoDeTriagemMinutos, String chaveIdempotencia) {
        this(cliente, telefone, modelo, placa, descricao, localizacao, solicitante, motivo, contexto, null,
                solicitante == null ? null : solicitante.getId(), solicitante == null ? null : solicitante.getNome(),
                prazoDeTriagemMinutos, chaveIdempotencia);
    }
}
