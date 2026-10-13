package br.com.viaflux.api.chamado;

import org.springframework.data.domain.Page;

import java.util.List;

public record ChamadosPageResponse(
        List<ChamadoListaItemResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    static ChamadosPageResponse from(Page<Chamado> chamados) {
        return new ChamadosPageResponse(
                chamados.getContent().stream().map(ChamadoListaItemResponse::from).toList(),
                chamados.getNumber(),
                chamados.getSize(),
                chamados.getTotalElements(),
                chamados.getTotalPages()
        );
    }
}
