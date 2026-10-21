package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MetricasService {

    private final ColetaDeMetricas coleta;
    private final CalculoDeMetricas calculo;
    private final ExportacaoDeMetricas exportacao;

    MetricasService(ColetaDeMetricas coleta, CalculoDeMetricas calculo, ExportacaoDeMetricas exportacao) {
        this.coleta = coleta;
        this.calculo = calculo;
        this.exportacao = exportacao;
    }

    @Transactional(readOnly = true)
    MetricasResponse consultar(FiltrosDeMetricas filtros) {
        return calculo.calcular(coleta.coletar(filtros), filtros);
    }

    @Transactional(readOnly = true)
    String exportar(FiltrosDeMetricas filtros) {
        return exportacao.paraCsv(coleta.coletar(filtros));
    }
}
