package br.com.viaflux.api.chamado.metricas;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MetricasService{

    private final ColetaDeMetricas coleta;
    private final CalculoDeMetricas calculo;
    private final ExportacaoDeMetricas exportacao;

    public MetricasService(ColetaDeMetricas coleta, CalculoDeMetricas calculo, ExportacaoDeMetricas exportacao) {
        this.coleta = coleta;
        this.calculo = calculo;
        this.exportacao = exportacao;
    }

    @Transactional(readOnly = true)
    public MetricasResponse consultar(FiltrosDeMetricas filtros) {
        return calculo.calcular(coleta.coletar(filtros), filtros);
    }

    @Transactional(readOnly = true)
    public String exportar(FiltrosDeMetricas filtros) {
        return exportacao.paraCsv(coleta.coletar(filtros));
    }
}
