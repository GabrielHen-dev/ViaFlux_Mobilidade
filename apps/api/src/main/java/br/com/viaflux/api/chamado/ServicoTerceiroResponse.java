package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ServicoTerceiroResponse(
        UUID id,
        String chamadoId,
        FornecedorResponse fornecedor,
        String tipoServico,
        String local,
        String observacao,
        StatusServico status,
        OffsetDateTime atualizadoEm,
        List<AtualizacaoServicoResponse> historico
) {

    static ServicoTerceiroResponse de(ServicoTerceiro servico) {
        return new ServicoTerceiroResponse(
                servico.getId(),
                servico.getChamado().getCodigo(),
                FornecedorResponse.de(servico.getFornecedor()),
                servico.getTipoServico(),
                servico.getLocal(),
                servico.getObservacao(),
                servico.getStatus(),
                Datas.local(servico.getAtualizadoEm()),
                servico.getHistorico().stream().map(AtualizacaoServicoResponse::de).toList()
        );
    }
}
