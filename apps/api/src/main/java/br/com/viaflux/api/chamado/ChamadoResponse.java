package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
public record ChamadoResponse(
        String id,
        String cliente,
        String telefone,
        String modelo,
        String placa,
        String tipo,
        String prioridade,
        String descricao,
        String localizacao,
        String status,
        OffsetDateTime abertura
) {
    static ChamadoResponse from(Chamado chamado) {
        return new ChamadoResponse(
                chamado.getCodigo(),
                chamado.getCliente(),
                chamado.getTelefone(),
                chamado.getModelo(),
                chamado.getPlaca(),
                chamado.getTipo(),
                chamado.getPrioridade(),
                chamado.getDescricao(),
                chamado.getLocalizacao(),
                "Aberto",
                chamado.getAbertoEm()
        );
    }
}
