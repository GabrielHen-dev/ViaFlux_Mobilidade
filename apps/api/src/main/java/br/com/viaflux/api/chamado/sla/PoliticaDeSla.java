package br.com.viaflux.api.chamado.sla;


import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.GatilhoDeSla;
import br.com.viaflux.api.chamado.LimiarDeSla;
import br.com.viaflux.api.chamado.PausaDoChamado;
import br.com.viaflux.api.chamado.PrazoDeSla;
import br.com.viaflux.api.chamado.Prioridade;
import br.com.viaflux.api.chamado.sla.AvaliacaoDePrazo;
import br.com.viaflux.api.chamado.sla.Pausa;
import br.com.viaflux.api.chamado.sla.Relogio;
import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PoliticaDeSla{

    public record Prazos(int primeiraRespostaMinutos, int resolucaoMinutos, Relogio relogio) {
    }

    private static final int MINUTOS_PARA_ACIONAR_P1 = 15;

    private final Map<Prioridade, Prazos> prazos = new EnumMap<>(Prioridade.class);
    private final RelogioCorrido relogioCorrido;

    public PoliticaDeSla(RelogioCorrido relogioCorrido, RelogioDeHorasUteis expediente) {
        this.relogioCorrido = relogioCorrido;
        prazos.put(Prioridade.P1, new Prazos(15, 2 * 60, relogioCorrido));
        prazos.put(Prioridade.P2, new Prazos(30, 4 * 60, relogioCorrido));
        prazos.put(Prioridade.P3, new Prazos(2 * 60, 24 * 60, expediente));
        prazos.put(Prioridade.P4, new Prazos(4 * 60, 48 * 60, expediente));
    }

    public Prazos prazosDe(Prioridade prioridade) {
        return prazos.get(prioridade);
    }

    public SlaResponse avaliar(Chamado chamado, Instant instante) {
        Prioridade prioridade = chamado.prioridadeEfetiva();
        if (prioridade == null) {
            return null;
        }
        Instant agora = chamado.cancelado() ? chamado.getCanceladoEm().toInstant() : instante;
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

    public List<GatilhoDeSla> gatilhosAlcancados(Chamado chamado, Instant agora) {
        Prioridade prioridade = chamado.prioridadeEfetiva();
        if (prioridade == null) {
            return List.of();
        }
        Prazos prazosDaPrioridade = prazos.get(prioridade);
        Relogio relogio = prazosDaPrioridade.relogio();
        Instant inicio = chamado.getAbertoEm().toInstant();
        List<GatilhoDeSla> gatilhos = new ArrayList<>();
        if (chamado.getPrimeiraRespostaEm() == null) {
            gatilhos.addAll(limiaresAlcancados(PrazoDeSla.PRIMEIRA_RESPOSTA,
                    AvaliacaoDePrazo.fracaoConsumida(relogio, inicio, prazosDaPrioridade.primeiraRespostaMinutos(), 0, agora)));
            if (prioridade == Prioridade.P1 && relogioCorrido.minutosEntre(inicio, agora) >= MINUTOS_PARA_ACIONAR_P1) {
                gatilhos.add(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA));
            }
        }
        if (chamado.getResolvidoEm() == null) {
            List<Pausa> pausas = chamado.getPausas().stream().map(PausaDoChamado::paraPausa).toList();
            double pausado = AvaliacaoDePrazo.minutosPausados(relogio, pausas, agora);
            gatilhos.addAll(limiaresAlcancados(PrazoDeSla.RESOLUCAO,
                    AvaliacaoDePrazo.fracaoConsumida(relogio, inicio, prazosDaPrioridade.resolucaoMinutos(), pausado, agora)));
        }
        return gatilhos;
    }

    private static List<GatilhoDeSla> limiaresAlcancados(PrazoDeSla prazo, double fracaoConsumida) {
        return Arrays.stream(LimiarDeSla.values())
                .filter(limiar -> limiar.alcancadoPor(fracaoConsumida))
                .map(limiar -> new GatilhoDeSla(prazo, limiar))
                .toList();
    }

    private static Instant instante(OffsetDateTime data) {
        return data == null ? null : data.toInstant();
    }
}
