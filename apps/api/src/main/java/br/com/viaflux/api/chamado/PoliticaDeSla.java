package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.AvaliacaoDePrazo;
import br.com.viaflux.api.chamado.sla.Pausa;
import br.com.viaflux.api.chamado.sla.Relogio;
import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
class PoliticaDeSla {

    record Prazos(int primeiraRespostaMinutos, int resolucaoMinutos, Relogio relogio) {
    }

    private final Map<Prioridade, Prazos> prazos = new EnumMap<>(Prioridade.class);
    private final RelogioCorrido relogioCorrido;

    PoliticaDeSla(RelogioCorrido relogioCorrido, RelogioDeHorasUteis expediente) {
        this.relogioCorrido = relogioCorrido;
        prazos.put(Prioridade.P1, new Prazos(15, 2 * 60, relogioCorrido));
        prazos.put(Prioridade.P2, new Prazos(30, 4 * 60, relogioCorrido));
        prazos.put(Prioridade.P3, new Prazos(2 * 60, 24 * 60, expediente));
        prazos.put(Prioridade.P4, new Prazos(4 * 60, 48 * 60, expediente));
    }

    Prazos prazosDe(Prioridade prioridade) {
        return prazos.get(prioridade);
    }

    SlaResponse avaliar(Chamado chamado, Instant agora) {
        Prioridade prioridade = chamado.prioridadeEfetiva();
        if (prioridade == null) {
            return null;
        }
        Prazos prazosDaPrioridade = prazos.get(prioridade);
        Relogio relogio = prazosDaPrioridade.relogio();
        Instant inicio = chamado.getAbertoEm().toInstant();
        Instant resolvidoEm = instante(chamado.getResolvidoEm());
        List<Pausa> pausas = chamado.getPausas().stream().map(PausaDoChamado::paraPausa).toList();
        double pausadoNaResolucao = AvaliacaoDePrazo.minutosPausados(relogio, pausas, resolvidoEm != null ? resolvidoEm : agora);
        AvaliacaoDePrazo primeiraResposta = AvaliacaoDePrazo.avaliar(
                relogio, inicio, prazosDaPrioridade.primeiraRespostaMinutos(), 0, instante(chamado.getPrimeiraRespostaEm()), agora);
        AvaliacaoDePrazo resolucao = AvaliacaoDePrazo.avaliar(
                relogio, inicio, prazosDaPrioridade.resolucaoMinutos(), pausadoNaResolucao, resolvidoEm, agora);
        boolean pausado = pausas.stream().anyMatch(Pausa::emAndamento);
        long tempoPausado = Math.round(AvaliacaoDePrazo.minutosPausados(relogioCorrido, pausas, agora));
        return new SlaResponse(PrazoResponse.de(primeiraResposta), PrazoResponse.de(resolucao), pausado, tempoPausado);
    }

    private static Instant instante(OffsetDateTime data) {
        return data == null ? null : data.toInstant();
    }
}
