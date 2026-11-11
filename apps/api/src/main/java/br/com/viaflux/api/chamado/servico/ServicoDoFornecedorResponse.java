package br.com.viaflux.api.chamado.servico;


import br.com.viaflux.api.chamado.ChamadoEvento;
import br.com.viaflux.api.chamado.Datas;
import br.com.viaflux.api.chamado.MensagemAoFornecedorResponse;
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
        List<AtualizacaoServicoResponse> historico,
        List<MensagemAoFornecedorResponse> mensagens
) {

    public static ServicoDoFornecedorResponse de(ServicoTerceiro servico) {
        return de(servico, List.of());
    }

    public static ServicoDoFornecedorResponse de(ServicoTerceiro servico, List<ChamadoEvento> mensagens) {
        return new ServicoDoFornecedorResponse(
                servico.getId(),
                servico.getChamado().getCodigo(),
                servico.getTipoServico(),
                servico.getLocal(),
                servico.getObservacao(),
                servico.getStatus(),
                Datas.local(servico.getAtualizadoEm()),
                servico.getHistorico().stream().map(AtualizacaoServicoResponse::de).toList(),
                mensagens.stream().map(MensagemAoFornecedorResponse::de).toList()
        );
    }
}
