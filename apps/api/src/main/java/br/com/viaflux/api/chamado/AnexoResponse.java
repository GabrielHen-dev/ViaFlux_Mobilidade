package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AnexoResponse(UUID id, String nome, String tipoConteudo, long tamanho, OffsetDateTime enviadoEm, Autor autor) {

    static AnexoResponse de(ChamadoAnexo anexo) {
        return new AnexoResponse(
                anexo.getId(), anexo.getNome(), anexo.getTipoConteudo(), anexo.getTamanho(), Datas.local(anexo.getEnviadoEm()), anexo.getAutor());
    }
}
