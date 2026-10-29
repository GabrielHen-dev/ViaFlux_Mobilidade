package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

@Component
class MontagemDeChamado {

    private final ChamadoEventoRepository eventos;
    private final ChamadoAnexoRepository anexos;
    private final ServicoTerceiroRepository servicos;
    private final PoliticaDeSla politicaDeSla;
    private final PoliticaDeTriagem politicaDeTriagem;
    private final JanelaDeEncerramento janelaDeEncerramento;
    private final Clock relogio;

    MontagemDeChamado(
            ChamadoEventoRepository eventos,
            ChamadoAnexoRepository anexos,
            ServicoTerceiroRepository servicos,
            PoliticaDeSla politicaDeSla,
            PoliticaDeTriagem politicaDeTriagem,
            JanelaDeEncerramento janelaDeEncerramento,
            Clock relogio
    ) {
        this.eventos = eventos;
        this.anexos = anexos;
        this.servicos = servicos;
        this.politicaDeSla = politicaDeSla;
        this.politicaDeTriagem = politicaDeTriagem;
        this.janelaDeEncerramento = janelaDeEncerramento;
        this.relogio = relogio;
    }

    ChamadoResumoResponse resumo(Chamado chamado) {
        Instant agora = relogio.instant();
        return new ChamadoResumoResponse(
                chamado.getCodigo(),
                chamado.getCliente(),
                chamado.getModelo(),
                chamado.getPlaca(),
                chamado.getLocalizacao().getEndereco(),
                chamado.getStatus().getRotulo(),
                chamado.prioridadeEfetiva(),
                chamado.score(),
                chamado.tipoVigente(),
                DepartamentoResponse.de(chamado.getDepartamento()),
                Datas.local(chamado.getAbertoEm()),
                Datas.local(chamado.getAtualizadoEm()),
                politicaDeSla.avaliar(chamado, agora),
                politicaDeTriagem.avaliar(chamado, agora),
                AtendimentoResponse.de(chamado),
                EscalonamentoResponse.de(chamado)
        );
    }

    ChamadoResponse completo(Chamado chamado, boolean visaoDeCliente) {
        ChamadoResumoResponse resumo = resumo(chamado);
        List<EventoResponse> timeline = eventos.findByChamadoIdOrderByOcorridoEmAscSequenciaAsc(chamado.getId()).stream()
                .filter(evento -> !visaoDeCliente || evento.isVisivelCliente())
                .map(EventoResponse::de)
                .toList();
        List<AnexoResponse> anexosDoChamado = anexos.findByChamadoIdOrderByEnviadoEmAsc(chamado.getId()).stream()
                .filter(anexo -> !visaoDeCliente || anexo.getVisibilidade() == VisibilidadeDoConteudo.SOLICITANTE)
                .map(AnexoResponse::de)
                .toList();
        ServicoTerceiroResponse servico = visaoDeCliente ? null : servicos.findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(chamado.getId())
                .stream()
                .findFirst()
                .map(ServicoTerceiroResponse::de)
                .orElse(null);
        return new ChamadoResponse(
                resumo.id(),
                resumo.cliente(),
                resumo.modelo(),
                resumo.placa(),
                resumo.localizacao(),
                resumo.status(),
                resumo.prioridade(),
                resumo.score(),
                resumo.tipo(),
                resumo.departamento(),
                resumo.abertura(),
                resumo.atualizadoEm(),
                resumo.sla(),
                resumo.triagem(),
                resumo.atendimento(),
                chamado.getTelefone(),
                chamado.getDescricao(),
                MotivoResponse.de(chamado.getMotivo()),
                ContextoResponse.de(chamado.getContexto()),
                ClassificacaoResponse.de(chamado),
                visaoDeCliente ? null : OverrideResponse.de(chamado),
                chamado.getMotivoAguardando(),
                chamado.getLocalizacao().informada() ? chamado.getLocalizacao().paraDados() : null,
                timeline,
                anexosDoChamado,
                servico,
                chamado.getMotivoOutro(),
                chamado.getAbertoPorNome(),
                chamado.getClassificacaoVersao(),
                chamado.getRoteamentoVersao(),
                chamado.getSlaVersao(),
                chamado.getResolucaoResumo(),
                chamado.getClassificacaoEstado(),
                chamado.getEpisodio(),
                Datas.local(janelaDeEncerramento.confirmacaoAte(chamado)),
                Datas.local(janelaDeEncerramento.reaberturaAte(chamado)),
                visaoDeCliente ? null : resumo.escalonamento()
        );
    }
}
