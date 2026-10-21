package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
class ExportacaoDeMetricas {

    private static final String MARCA_DE_ORDEM_DE_BYTES = "\uFEFF";
    private static final List<String> CABECALHO = List.of(
            "protocolo", "abertura", "tipo", "departamento", "prioridade", "score", "status", "minutos_ate_triagem",
            "reclassificado", "override", "sla_primeira_resposta", "sla_resolucao", "minutos_ate_resolucao", "fornecedor"
    );

    String paraCsv(List<LinhaDeMetrica> linhas) {
        Stream<String> corpo = linhas.stream().map(ExportacaoDeMetricas::linha);
        return MARCA_DE_ORDEM_DE_BYTES + Stream.concat(Stream.of(String.join(";", CABECALHO)), corpo).collect(Collectors.joining("\n"));
    }

    private static String linha(LinhaDeMetrica linha) {
        ChamadoResumoResponse resumo = linha.resumo();
        return Stream.of(
                resumo.id(),
                resumo.abertura().toString(),
                resumo.tipo().getNome(),
                resumo.departamento() == null ? "" : resumo.departamento().nome(),
                resumo.prioridade() == null ? "" : resumo.prioridade().name(),
                resumo.score() == null ? "" : resumo.score().toString(),
                resumo.status(),
                linha.minutosAteTriar().map(String::valueOf).orElse(""),
                linha.reclassificado() ? "sim" : "não",
                linha.comOverride() ? "sim" : "não",
                resumo.sla() == null ? "" : resumo.sla().primeiraResposta().situacao().name(),
                resumo.sla() == null ? "" : resumo.sla().resolucao().situacao().name(),
                linha.minutosAteResolver().map(String::valueOf).orElse(""),
                linha.servico().map(servico -> servico.getFornecedor().getNome()).orElse("")
        ).map(ExportacaoDeMetricas::celula).collect(Collectors.joining(";"));
    }

    private static String celula(String valor) {
        return valor.matches("(?s).*[;\"\n].*") ? "\"" + valor.replace("\"", "\"\"") + "\"" : valor;
    }
}
