package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.anexo.AnexoResponse;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MensagemResponse(
        UUID id,
        String texto,
        Autor autor,
        OffsetDateTime enviadaEm,
        boolean visivelCliente,
        OrigemDaMensagem origem,
        AnexoResponse anexo
) {

    public static MensagemResponse de(ChamadoEvento evento, AnexoResponse anexo) {
        return new MensagemResponse(
                evento.getId(),
                evento.getDetalhe(),
                evento.getAutor(),
                Datas.local(evento.getOcorridoEm()),
                evento.isVisivelCliente(),
                evento.getOrigemDaMensagem(),
                anexo
        );
    }
}
