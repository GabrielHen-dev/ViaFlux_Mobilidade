package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.function.Function;
import java.util.function.Predicate;

import static br.com.viaflux.api.chamado.MetricasResponse.Indicador.medido;
import static br.com.viaflux.api.chamado.MetricasResponse.Indicador.pendente;

@Component
class CalculoDeMetricas {

    private static final String PERCENTUAL = "percentual";
    private static final String MINUTOS = "minutos";

    private final PoliticaDeSla politicaDeSla;

    CalculoDeMetricas(PoliticaDeSla politicaDeSla) {
        this.politicaDeSla = politicaDeSla;
    }

    MetricasResponse calcular(List<LinhaDeMetrica> linhas, FiltrosDeMetricas filtros) {
        List<LinhaDeMetrica> triadas = linhas.stream().filter(linha -> linha.chamado().triado()).toList();
        List<ServicoTerceiro> servicos = linhas.stream().flatMap(linha -> linha.servico().stream()).toList();
        long servicosAtualizados = servicos.stream()
                .filter(servico -> servico.getHistorico().stream().anyMatch(registro -> registro.getStatus() != StatusServico.SOLICITADO))
                .count();
        List<MetricasResponse.Indicador> indicadores = List.of(
                medido("tmr", "Tempo médio de resolução", media(linhas, LinhaDeMetrica::minutosAteResolver), MINUTOS,
                        "Da abertura até o status Resolvido. Fechado não entra no prazo."),
                medido("tempo-triagem", "Tempo médio de triagem", media(linhas, LinhaDeMetrica::minutosAteTriar), MINUTOS,
                        "Da abertura até a triagem concluída pelo atendente."),
                medido("triagem-no-prazo", "Triagem dentro do prazo",
                        percentual(contar(linhas, CalculoDeMetricas::triadoNoPrazo), contar(linhas, CalculoDeMetricas::triagemAvaliavel)),
                        PERCENTUAL, "Prazo definido pela urgência informada pelo cliente: 10, 20 ou 40 minutos."),
                medido("aderencia-primeira-resposta", "Aderência ao SLA de 1ª resposta",
                        aderencia(triadas, linha -> linha.resumo().sla().primeiraResposta().situacao()), PERCENTUAL,
                        "Prazos já cumpridos ou violados no período."),
                medido("aderencia-resolucao", "Aderência ao SLA de resolução",
                        aderencia(triadas, linha -> linha.resumo().sla().resolucao().situacao()), PERCENTUAL,
                        "Prazos já cumpridos ou violados no período."),
                medido("rastreabilidade", "Rastreabilidade completa", percentual(contar(linhas, LinhaDeMetrica::rastreavel), linhas.size()), PERCENTUAL,
                        "Chamados com motivo, contexto, triagem e encaminhamento registrados."),
                medido("triagem-correta", "Triagem correta na 1ª tentativa",
                        percentual(contar(triadas, linha -> !linha.reclassificado()), triadas.size()), PERCENTUAL,
                        "Chamados triados que não precisaram de reclassificação."),
                medido("taxa-reclassificacao", "Taxa de reclassificação", percentual(contar(triadas, LinhaDeMetrica::reclassificado), triadas.size()),
                        PERCENTUAL, "Chamados com ao menos uma reclassificação depois da triagem."),
                medido("taxa-override", "Taxa de override manual", percentual(contar(triadas, LinhaDeMetrica::comOverride), triadas.size()),
                        PERCENTUAL, "Chamados com prioridade alterada manualmente."),
                medido("atualizacao-fornecedores", "Atualização de status por fornecedores", percentual(servicosAtualizados, servicos.size()),
                        PERCENTUAL, "Serviços terceirizados com ao menos uma atualização do próprio fornecedor."),
                medido("aceite-fornecedores", "Aceite do fornecedor no prazo", percentual(aceitosNoPrazo(linhas), servicos.size()),
                        PERCENTUAL, "Status Recebido dentro do prazo de 1ª resposta da prioridade (meta-base proposta)."),
                pendente("csat", "CSAT", "Depende de pesquisa de satisfação ainda não implantada."),
                pendente("repeticao-informacoes", "Repetição de informações por incidente", "Depende de levantamento manual nas planilhas atuais."),
                pendente("adesao-portal", "Adesão ao portal", "Depende do volume de chamados por telefone, WhatsApp e e-mail, que ficam fora da plataforma.")
        );
        return new MetricasResponse(
                new MetricasResponse.Periodo(filtros.de(), filtros.ate()),
                linhas.size(),
                indicadores,
                distribuicao(triadas)
        );
    }

    private long aceitosNoPrazo(List<LinhaDeMetrica> linhas) {
        return linhas.stream()
                .filter(linha -> linha.servico().isPresent() && linha.chamado().prioridadeEfetiva() != null)
                .filter(linha -> {
                    List<ServicoAtualizacao> historico = linha.servico().get().getHistorico();
                    Optional<ServicoAtualizacao> recebido = historico.stream().filter(registro -> registro.getStatus() == StatusServico.RECEBIDO).findFirst();
                    if (historico.isEmpty() || recebido.isEmpty()) {
                        return false;
                    }
                    long minutos = Duration.between(historico.getFirst().getRegistradoEm(), recebido.get().getRegistradoEm()).toMinutes();
                    return minutos <= politicaDeSla.prazosDe(linha.chamado().prioridadeEfetiva()).primeiraRespostaMinutos();
                })
                .count();
    }

    private static boolean triadoNoPrazo(LinhaDeMetrica linha) {
        return linha.resumo().triagem().situacao() == SituacaoPrazo.CUMPRIDO;
    }

    private static boolean triagemAvaliavel(LinhaDeMetrica linha) {
        SituacaoPrazo situacao = linha.resumo().triagem().situacao();
        return !situacao.emAberto() || situacao == SituacaoPrazo.VIOLADO;
    }

    private static Map<Prioridade, Long> distribuicao(List<LinhaDeMetrica> triadas) {
        Map<Prioridade, Long> contagem = new EnumMap<>(Prioridade.class);
        Arrays.stream(Prioridade.values()).forEach(prioridade -> contagem.put(prioridade, 0L));
        triadas.forEach(linha -> contagem.merge(linha.chamado().prioridadeEfetiva(), 1L, Long::sum));
        return contagem;
    }

    private static Double aderencia(List<LinhaDeMetrica> triadas, Function<LinhaDeMetrica, SituacaoPrazo> situacao) {
        List<SituacaoPrazo> avaliaveis = triadas.stream()
                .map(situacao)
                .filter(atual -> atual != SituacaoPrazo.NO_PRAZO && atual != SituacaoPrazo.EM_RISCO)
                .toList();
        return percentual(avaliaveis.stream().filter(atual -> atual == SituacaoPrazo.CUMPRIDO).count(), avaliaveis.size());
    }

    private static Double media(List<LinhaDeMetrica> linhas, Function<LinhaDeMetrica, Optional<Long>> minutos) {
        OptionalDouble media = linhas.stream().flatMap(linha -> minutos.apply(linha).stream()).mapToLong(Long::longValue).average();
        return media.isPresent() ? (double) Math.round(media.getAsDouble()) : null;
    }

    private static long contar(List<LinhaDeMetrica> linhas, Predicate<LinhaDeMetrica> criterio) {
        return linhas.stream().filter(criterio).count();
    }

    private static Double percentual(long parte, long total) {
        return total == 0 ? null : Math.round(parte * 1000.0 / total) / 10.0;
    }
}
