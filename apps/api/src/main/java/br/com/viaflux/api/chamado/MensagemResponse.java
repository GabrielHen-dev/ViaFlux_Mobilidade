package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.anexo.AnexoResponse;
import br.com.viaflux.api.chamado.anexo.VisibilidadeDoConteudo;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MensagemResponse(
        UUID id,
        String texto,
        Autor autor,
        OffsetDateTime enviadaEm,
        boolean visivelCliente,
        OrigemDaMensagem origem,
        AnexoResponse anexo,
        VisibilidadeDoConteudo visibilidade
) {

    public MensagemResponse(UUID id, String texto, Autor autor, OffsetDateTime enviadaEm, boolean visivelCliente, OrigemDaMensagem origem, AnexoResponse anexo) {
        this(id, texto, autor, enviadaEm, visivelCliente, origem, anexo,
                visivelCliente ? VisibilidadeDoConteudo.SOLICITANTE : VisibilidadeDoConteudo.INTERNO);
    }

    public static MensagemResponse de(ChamadoEvento evento, AnexoResponse anexo) {
        return new MensagemResponse(
                evento.getId(),
                evento.getDetalhe(),
                evento.getAutor(),
                Datas.local(evento.getOcorridoEm()),
                evento.isVisivelCliente(),
                evento.getOrigemDaMensagem(),
                anexo,
                evento.getVisibilidade()
        );
    }
}
