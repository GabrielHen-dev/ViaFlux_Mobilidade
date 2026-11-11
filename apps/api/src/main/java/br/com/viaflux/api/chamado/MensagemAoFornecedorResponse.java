package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MensagemAoFornecedorResponse(UUID id, String texto, Autor autor, OffsetDateTime enviadaEm) {

    static MensagemAoFornecedorResponse de(ChamadoEvento evento) {
        return new MensagemAoFornecedorResponse(evento.getId(), evento.getDetalhe(), evento.getAutor(), Datas.local(evento.getOcorridoEm()));
    }
}
