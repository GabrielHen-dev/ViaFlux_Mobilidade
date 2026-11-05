package br.com.viaflux.api.chamado.triagem;


import br.com.viaflux.api.chamado.Prioridade;
import br.com.viaflux.api.chamado.TipoChamado;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class RoteamentoComPlantao implements RegraDeRoteamento {

    private final RelogioDeHorasUteis expediente;

    public RoteamentoComPlantao(RelogioDeHorasUteis expediente) {
        this.expediente = expediente;
    }

    @Override
    public TipoChamado destino(TipoChamado tipo, Prioridade prioridade, Instant instante) {
        return destino(tipo, prioridade, 1, instante);
    }

    @Override
    public TipoChamado destino(TipoChamado tipo, Prioridade prioridade, int urgencia, Instant instante) {
        boolean plantao = (prioridade == Prioridade.P1 || prioridade == Prioridade.P2)
                && urgencia == 5 && tipo.isOperacional() && !expediente.emExpediente(instante);
        return plantao ? TipoChamado.ASSISTENCIA_24H : tipo;
    }

    public String acionamentoDeP1(Instant instante) {
        return expediente.emExpediente(instante) ? "Central de Assistência" : "Plantão";
    }
}
