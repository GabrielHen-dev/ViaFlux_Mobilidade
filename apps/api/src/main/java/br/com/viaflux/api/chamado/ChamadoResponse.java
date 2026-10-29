package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.List;

public record ChamadoResponse(
        String id,
        String cliente,
        String modelo,
        String placa,
        String localizacao,
        String status,
        Prioridade prioridade,
        Integer score,
        TipoChamado tipo,
        DepartamentoResponse departamento,
        OffsetDateTime abertura,
        OffsetDateTime atualizadoEm,
        SlaResponse sla,
        TriagemResponse triagem,
        AtendimentoResponse atendimento,
        String telefone,
        String descricao,
        MotivoResponse motivo,
        ContextoResponse contexto,
        ClassificacaoResponse classificacao,
        OverrideResponse override,
        MotivoAguardando motivoAguardando,
        DadosDeLocalizacao localizacaoDetalhada,
        List<EventoResponse> timeline,
        List<AnexoResponse> anexos,
        ServicoTerceiroResponse servico,
        String motivoOutro,
        String abertoPorNome,
        String classificacaoVersao,
        String roteamentoVersao,
        String slaVersao,
        String resolucaoResumo,
        String estadoClassificacao,
        int episodio,
        OffsetDateTime confirmacaoAte,
        OffsetDateTime reaberturaAte,
        EscalonamentoResponse escalonamento
) {
    public ChamadoResponse(String id, String cliente, String modelo, String placa, String localizacao, String status,
                           Prioridade prioridade, Integer score, TipoChamado tipo, DepartamentoResponse departamento,
                           OffsetDateTime abertura, OffsetDateTime atualizadoEm, SlaResponse sla, TriagemResponse triagem,
                           AtendimentoResponse atendimento, String telefone, String descricao, MotivoResponse motivo,
                           ContextoResponse contexto, ClassificacaoResponse classificacao, OverrideResponse override,
                           MotivoAguardando motivoAguardando, DadosDeLocalizacao localizacaoDetalhada,
                           List<EventoResponse> timeline, List<AnexoResponse> anexos, ServicoTerceiroResponse servico) {
        this(id, cliente, modelo, placa, localizacao, status, prioridade, score, tipo, departamento, abertura, atualizadoEm,
                sla, triagem, atendimento, telefone, descricao, motivo, contexto, classificacao, override, motivoAguardando,
                localizacaoDetalhada, timeline, anexos, servico, null, null, null, null, null, null, null, 1, null, null, null);
    }
}
