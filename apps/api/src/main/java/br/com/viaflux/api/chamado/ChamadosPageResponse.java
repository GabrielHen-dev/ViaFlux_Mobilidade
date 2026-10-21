package br.com.viaflux.api.chamado;

import java.util.List;

public record ChamadosPageResponse(
        List<ChamadoResumoResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    static ChamadosPageResponse de(List<ChamadoResumoResponse> todos, int page, int size) {
        int inicio = (int) Math.min(todos.size(), (long) page * size);
        int fim = (int) Math.min(todos.size(), (long) inicio + size);
        int totalPages = (int) Math.ceil(todos.size() / (double) size);
        return new ChamadosPageResponse(todos.subList(inicio, fim), page, size, todos.size(), totalPages);
    }
}
