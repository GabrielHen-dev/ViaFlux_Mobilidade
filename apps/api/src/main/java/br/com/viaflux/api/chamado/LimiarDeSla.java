package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.AvaliacaoDePrazo;

enum LimiarDeSla {
    CINQUENTA_POR_CENTO(AvaliacaoDePrazo.PERCENTUAL_EM_RISCO, TipoEvento.SLA, "SLA em risco (50%)", "Prazo de SLA em risco", "Em risco", "50% do prazo consumido"),
    OITENTA_POR_CENTO(0.8, TipoEvento.ESCALONAMENTO, "SLA em risco (80%)", "Alerta de SLA à liderança", "Em risco", "80% do prazo consumido"),
    CEM_POR_CENTO(1.0, TipoEvento.SLA, "SLA violado", "Violação de SLA registrada", "Violado", "100% do prazo consumido"),
    P1_SEM_PRIMEIRA_RESPOSTA(Double.POSITIVE_INFINITY, TipoEvento.ESCALONAMENTO, "P1 sem primeira resposta", "P1 sem primeira resposta escalonado", "Violado", "sem primeira resposta após 15 minutos");

    private final double fracaoDoPrazo;
    private final TipoEvento tipoDoEvento;
    private final String assunto;
    private final String acao;
    private final String situacao;
    private final String consumo;

    LimiarDeSla(double fracaoDoPrazo, TipoEvento tipoDoEvento, String assunto, String acao, String situacao, String consumo) {
        this.fracaoDoPrazo = fracaoDoPrazo;
        this.tipoDoEvento = tipoDoEvento;
        this.assunto = assunto;
        this.acao = acao;
        this.situacao = situacao;
        this.consumo = consumo;
    }

    boolean alcancadoPor(double fracaoConsumida) {
        return fracaoConsumida >= fracaoDoPrazo;
    }

    TipoEvento tipoDoEvento() {
        return tipoDoEvento;
    }

    String assunto() {
        return assunto;
    }

    String acao() {
        return acao;
    }

    String situacao() {
        return situacao;
    }

    String consumo() {
        return consumo;
    }
}
