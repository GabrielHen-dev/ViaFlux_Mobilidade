package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ServicoDoFornecedorResponse(
        UUID id,
        String chamadoId,
        String tipoServico,
        String local,
        String observacao,
        StatusServico status,
        OffsetDateTime atualizadoEm,
        List<AtualizacaoServicoResponse> historico
) {

    static ServicoDoFornecedorResponse de(ServicoTerceiro servico) {
        return new ServicoDoFornecedorResponse(
                servico.getId(),
                servico.getChamado().getCodigo(),
                servico.getTipoServico(),
                servico.getLocal(),
                servico.getObservacao(),
                servico.getStatus(),
                Datas.local(servico.getAtualizadoEm()),
                servico.getHistorico().stream().map(AtualizacaoServicoResponse::de).toList()
        );
    }
}
