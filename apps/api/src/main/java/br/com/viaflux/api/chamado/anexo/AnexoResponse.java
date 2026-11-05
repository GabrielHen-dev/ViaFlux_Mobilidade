package br.com.viaflux.api.chamado.anexo;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Datas;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AnexoResponse(UUID id, String nome, String tipoConteudo, long tamanho, OffsetDateTime enviadoEm, Autor autor, VisibilidadeDoConteudo visibilidade) {

    public static AnexoResponse de(ChamadoAnexo anexo) {
        return new AnexoResponse(
                anexo.getId(), anexo.getNome(), anexo.getTipoConteudo(), anexo.getTamanho(), Datas.local(anexo.getEnviadoEm()), anexo.getAutor(), anexo.getVisibilidade());
    }
}
