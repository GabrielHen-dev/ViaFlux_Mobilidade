package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventoResponse(
        UUID id,
        TipoEvento tipo,
        String acao,
        String detalhe,
        OffsetDateTime ocorridoEm,
        Autor autor,
        boolean visivelCliente,
        VisibilidadeDoConteudo visibilidade
) {

    static EventoResponse de(ChamadoEvento evento) {
        return new EventoResponse(
                evento.getId(),
                evento.getTipo(),
                evento.getAcao(),
                evento.getDetalhe(),
                Datas.local(evento.getOcorridoEm()),
                evento.getAutor(),
                evento.isVisivelCliente(),
                evento.getVisibilidade()
        );
    }
}
